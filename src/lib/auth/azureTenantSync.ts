import { prisma } from '@/lib/db/prisma'
import { getAppAccessToken } from '@/lib/auth/graphClient'

type GraphUser = {
  id: string
  displayName?: string
  userPrincipalName?: string
  givenName?: string
  surname?: string
  jobTitle?: string
}

type AzureIdentity = {
  entraObjectId?: string | null
  email?: string | null
}

const existenceCache = new Map<string, { exists: boolean; checkedAt: number }>()
const EXISTS_TTL_MS = 5 * 60 * 1000
const MISSING_TTL_MS = 60 * 1000

function splitName(displayName: string, fallbackEmail: string) {
  const trimmed = displayName.trim()
  if (!trimmed) {
    const local = fallbackEmail.split('@')[0] || 'User'
    return { firstName: local, lastName: '' }
  }

  const parts = trimmed.split(/\s+/)
  return {
    firstName: parts[0] || (fallbackEmail.split('@')[0] || 'User'),
    lastName: parts.slice(1).join(' '),
  }
}

export async function fetchAllGraphUsers(accessToken: string): Promise<GraphUser[]> {
  const users: GraphUser[] = []
  let nextUrl =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,givenName,surname,jobTitle&$top=999'

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Graph users fetch failed: ${res.status}`)
    }

    const data = (await res.json()) as { value?: GraphUser[]; '@odata.nextLink'?: string }
    users.push(...(data.value ?? []))
    nextUrl = data['@odata.nextLink'] ?? ''
  }

  return users
}

async function checkAzureUserExists(accessToken: string, identity: AzureIdentity): Promise<boolean> {
  const entraObjectId = identity.entraObjectId?.trim()
  const email = identity.email?.trim().toLowerCase()

  if (entraObjectId && !entraObjectId.startsWith('pending-')) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(entraObjectId)}?$select=id`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    )
    if (res.ok) return true
    if (res.status !== 404) {
      throw new Error(`Graph user lookup by object id failed: ${res.status}`)
    }
  }

  if (!email) return false
  const query = `https://graph.microsoft.com/v1.0/users?$select=id,userPrincipalName&$filter=userPrincipalName eq '${email.replace(/'/g, "''")}'`
  const res = await fetch(query, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Graph user lookup by email failed: ${res.status}`)
  }

  const data = (await res.json()) as { value?: Array<{ id: string }> }
  return Boolean(data.value?.length)
}

export async function userExistsInAzureTenant(identity: AzureIdentity): Promise<boolean> {
  const cacheKey = `${identity.entraObjectId ?? ''}|${(identity.email ?? '').toLowerCase()}`
  const now = Date.now()
  const cached = existenceCache.get(cacheKey)
  if (cached) {
    const ttl = cached.exists ? EXISTS_TTL_MS : MISSING_TTL_MS
    if (now - cached.checkedAt < ttl) {
      return cached.exists
    }
  }

  const token = await getAppAccessToken()
  const exists = await checkAzureUserExists(token, identity)
  existenceCache.set(cacheKey, { exists, checkedAt: now })
  return exists
}

export async function removeEmployeeAndDependencies(employeeId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: { OR: [{ recipientId: employeeId }, { senderId: employeeId }] },
    })
    await tx.auditLog.deleteMany({
      where: { OR: [{ performedBy: employeeId }, { targetId: employeeId }] },
    })
    await tx.leaveLedgerEntry.deleteMany({ where: { employeeId } })
    await tx.leaveRequest.updateMany({
      where: { approverId: employeeId },
      data: { approverId: null },
    })
    await tx.leaveRequest.deleteMany({ where: { employeeId } })
    await tx.leaveBalance.deleteMany({ where: { employeeId } })
    await tx.leaveRequest.deleteMany({ where: { employeeId } })
    await tx.leaveBalance.deleteMany({ where: { employeeId } })
    await tx.announcement.deleteMany({ where: { postedBy: employeeId } })
    await tx.employee.updateMany({
      where: { managerId: employeeId },
      data: { managerId: null },
    })
    await tx.employee.delete({ where: { id: employeeId } })
  })
}

export async function syncGraphUsersToDatabase(options?: { removeOrphans?: boolean }) {
  const accessToken = await getAppAccessToken()
  const graphUsers = await fetchAllGraphUsers(accessToken)
  const graphIds = new Set<string>()
  const graphEmails = new Set<string>()

  for (const gUser of graphUsers) {
    const email = (gUser.userPrincipalName ?? '').trim().toLowerCase()
    const displayName = (gUser.displayName ?? '').trim() || email
    if (!email || !gUser.id) continue

    graphIds.add(gUser.id)
    graphEmails.add(email)

    const name = splitName(displayName, email)
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [
          { workEmail: { equals: email } },
          { entraObjectId: gUser.id },
        ],
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: {
          workEmail: email,
          entraObjectId: gUser.id,
          displayName,
          firstName: (gUser.givenName ?? '').trim() || name.firstName,
          lastName: (gUser.surname ?? '').trim() || name.lastName,
          jobTitle: gUser.jobTitle ?? undefined,
        },
      })
    } else {
      await prisma.employee.create({
        data: {
          entraObjectId: gUser.id,
          workEmail: email,
          displayName,
          firstName: (gUser.givenName ?? '').trim() || name.firstName,
          lastName: (gUser.surname ?? '').trim() || name.lastName,
          jobTitle: gUser.jobTitle ?? null,
          role: 'EMPLOYEE',
          employmentStatus: 'ACTIVE',
        },
      })
    }
  }

  if (options?.removeOrphans) {
    const dbUsers = await prisma.employee.findMany({
      select: { id: true, entraObjectId: true, workEmail: true },
    })
    for (const user of dbUsers) {
      if (user.entraObjectId.startsWith('pending-')) continue
      const matchesById = Boolean(user.entraObjectId && graphIds.has(user.entraObjectId))
      const matchesByEmail = graphEmails.has((user.workEmail || '').toLowerCase())
      if (!matchesById && !matchesByEmail) {
        await removeEmployeeAndDependencies(user.id)
      }
    }
  }

  return { totalGraphUsers: graphUsers.length }
}
