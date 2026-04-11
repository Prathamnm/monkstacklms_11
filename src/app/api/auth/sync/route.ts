import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserGroupDisplayNamesByObjectId } from '@/lib/auth/graphClient'
import { verifyIdTokenFromRequest } from '@/lib/auth/validateToken'
import { ENTRA_GROUP_ROLE_MAP } from '@/constants/roles'

export async function POST(req: NextRequest) {
  try {
    let claims
    try {
      claims = await verifyIdTokenFromRequest(req)
    } catch (tokenErr) {
      console.error('[/api/auth/sync] Token verification failed:', {
        error: tokenErr instanceof Error ? tokenErr.message : String(tokenErr),
        hasAuthHeader: !!req.headers.get('authorization'),
      })
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { entraObjectId, email, displayName, firstName, lastName, jobTitle: claimJobTitle } = claims
    const body = await req.json().catch(() => ({}))
    const jobTitle = (body.jobTitle as string | undefined) ?? claimJobTitle

    // Role from Entra groups via app-only Graph (avoids heavy delegated scopes on the client)
    // Role priority — highest privilege wins if user is in multiple groups
    const ROLE_PRIORITY: Array<{ groupName: string; role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN' }> = [
      { groupName: 'LMS_Admins', role: 'ADMIN' },
      { groupName: 'LMS_HR', role: 'HR' },
      { groupName: 'LMS_Managers', role: 'MANAGER' },
      { groupName: 'LMS_Employees', role: 'EMPLOYEE' },
    ]

    let role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN' = 'EMPLOYEE'

    try {
      const groups = await getUserGroupDisplayNamesByObjectId(entraObjectId)
      console.log('[sync] Entra groups for user', entraObjectId, ':', groups)

      for (const { groupName, role: groupRole } of ROLE_PRIORITY) {
        if (groups.includes(groupName)) {
          role = groupRole
          console.log('[sync] Resolved role:', role, 'from group:', groupName)
          break // highest-priority match wins
        }
      }
    } catch (groupErr) {
      // Log the actual error — if this is a 403, admin consent is missing for GroupMember.Read.All
      console.error('[sync] Failed to fetch group memberships. Role will default to EMPLOYEE.', groupErr)
      console.error('[sync] ACTION REQUIRED: Grant admin consent for GroupMember.Read.All in Azure Portal')
      console.error('[sync] Go to: Azure Portal → App Registrations → Your App → API Permissions → Grant admin consent')
    }

    // Upsert employee in DB
    const employee = await prisma.employee.upsert({
      where: { entraObjectId },
      create: {
        entraObjectId,
        email,
        displayName: displayName ?? email,
        firstName: firstName ?? email.split('@')[0],
        lastName: lastName ?? '',
        jobTitle,
        role,
        employmentStatus: 'ACTIVE',
      },
      update: {
        email,
        displayName: displayName ?? email,
        jobTitle,
        role, // ← ALWAYS update role from latest Entra group membership
      },
      select: { id: true, role: true, employmentStatus: true },
    })

    // Initialize leave balance if it doesn't exist
    const year = new Date().getFullYear()
    await prisma.leaveBalance.upsert({
      where: { employeeId: employee.id },
      create: {
        employeeId: employee.id,
        year,
        standardTotal: 18,
        standardAccrued: 0,
        standardUsed: 0,
        standardCarryForward: 0,
        emergencyTotal: 2,
        emergencyUsed: 0,
      },
      update: {},
    })

    return NextResponse.json({ role: employee.role, employeeId: employee.id })
  } catch (err) {
    console.error('[/api/auth/sync] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
