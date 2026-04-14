import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
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

async function fetchAllGraphUsers(accessToken: string): Promise<GraphUser[]> {
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

async function syncGraphUsersToDatabase() {
  const accessToken = await getAppAccessToken()
  const graphUsers = await fetchAllGraphUsers(accessToken)
  console.log('[/api/admin/users] Azure users fetched:', graphUsers.length)

  for (const gUser of graphUsers) {
    const email = (gUser.userPrincipalName ?? '').trim().toLowerCase()
    const displayName = (gUser.displayName ?? '').trim() || email

    if (!email || !gUser.id) continue

    const name = splitName(displayName, email)
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { entraObjectId: gUser.id },
        ],
      },
      select: { id: true, entraObjectId: true },
    })

    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: {
          email,
          entraObjectId: gUser.id,
          displayName,
          firstName: (gUser.givenName ?? '').trim() || name.firstName,
          lastName: (gUser.surname ?? '').trim() || name.lastName,
          jobTitle: gUser.jobTitle ?? undefined,
        },
      })
    } else {
      const created = await prisma.employee.create({
        data: {
          entraObjectId: gUser.id,
          email,
          displayName,
          firstName: (gUser.givenName ?? '').trim() || name.firstName,
          lastName: (gUser.surname ?? '').trim() || name.lastName,
          jobTitle: gUser.jobTitle ?? null,
          role: 'EMPLOYEE',
          employmentStatus: 'ACTIVE',
        },
        select: { id: true, email: true },
      })
      console.log('[/api/admin/users] Created DB user from Azure:', created)
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    try {
      await syncGraphUsersToDatabase()
    } catch (graphErr) {
      console.error('[/api/admin/users] Azure sync failed, continuing with DB data:', graphErr)
    }

    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        email: true,
        entraObjectId: true,
        role: true,
        employmentStatus: true,
        jobTitle: true,
        joinDate: true,
      },
    })

    return NextResponse.json(employees)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
