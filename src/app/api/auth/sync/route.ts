import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserGroupsByObjectId } from '@/lib/auth/graphClient'
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
    // Pre-fetch existing user to avoid demoting them to 'EMPLOYEE' if Graph lookup fails
    const existingUser = await prisma.employee.findUnique({
      where: { entraObjectId },
      select: { role: true }
    })

    let role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN' = (existingUser?.role as any) ?? 'EMPLOYEE'

    try {
      const groups = await getUserGroupsByObjectId(entraObjectId)
      console.log('[sync] Entra groups for user', entraObjectId, ':', groups)

      const groupIds = groups.map(g => g.id)
      const groupNames = groups.map(g => g.displayName)

      // Sanitize env vars
      const adminId = (process.env.ENTRA_GROUP_ID_LMS_ADMINS || '').trim()
      const hrId = (process.env.ENTRA_GROUP_ID_LMS_HR || '').trim()
      const managerId = (process.env.ENTRA_GROUP_ID_LMS_MANAGERS || '').trim()
      const employeeId = (process.env.ENTRA_GROUP_ID_LMS_EMPLOYEES || '').trim()

      // 1. Check by ID (Recommended/Robust)
      if (adminId && groupIds.includes(adminId)) role = 'ADMIN'
      else if (hrId && groupIds.includes(hrId)) role = 'HR'
      else if (managerId && groupIds.includes(managerId)) role = 'MANAGER'
      else if (employeeId && groupIds.includes(employeeId)) role = 'EMPLOYEE'
      // 2. Fallback to Names (for convenience/testing)
      else if (groupNames.some(n => n.toLowerCase() === 'lms_admins' || n.toLowerCase() === 'lms_admin')) role = 'ADMIN'
      else if (groupNames.some(n => n.toLowerCase() === 'lms_hr')) role = 'HR'
      else if (groupNames.some(n => n.toLowerCase() === 'lms_managers' || n.toLowerCase() === 'lms_manager')) role = 'MANAGER'
      else if (groupNames.some(n => n.toLowerCase() === 'lms_employees' || n.toLowerCase() === 'lms_employee')) role = 'EMPLOYEE'

      console.log('[sync] Resolved role:', role)
    } catch (groupErr) {
      console.error('[sync] Failed to fetch group memberships. Preserving existing role:', role, groupErr)
    }

    // Upsert employee in DB
    const employee = await prisma.employee.upsert({
      where: { entraObjectId },
      create: {
        entraObjectId,
        email,
        displayName: displayName ?? email,
        firstName: firstName ?? (displayName ? displayName.split(' ')[0] : email.split('@')[0]),
        lastName: lastName ?? '',
        jobTitle,
        role,
        employmentStatus: 'ACTIVE',
      },
      update: {
        email,
        displayName: displayName ?? email,
        firstName: firstName ?? (displayName ? displayName.split(' ')[0] : email.split('@')[0]),
        lastName: lastName ?? '',
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
