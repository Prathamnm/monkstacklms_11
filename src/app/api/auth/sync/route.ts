import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { Role } from '@/constants/roles'
import { prisma } from '@/lib/db/prisma'
import { verifyIdTokenFromRequest } from '@/lib/auth/validateToken'
import { userExistsInAzureTenant } from '@/lib/auth/azureTenantSync'
import { getUserGroupsByObjectId, getUserExtendedProfile } from '@/lib/auth/graphClient'
import { ENTRA_GROUP_ROLE_MAP } from '@/constants/roles'
import { calculateProratedEmergencyLeaves, calculateProratedLeaves, calculateProratedFloaterLeaves } from '@/lib/leave/prorateService'

const DEFAULT_ROLE: Role = 'EMPLOYEE'

function normalizeRole(role: unknown): Role {
  if (role === 'HR') return 'HR'
  return (role === 'MANAGER' || role === 'HR' ? role : DEFAULT_ROLE) as Role
}

function pickHighestPrivilegeRole(roles: Role[]): Role {
  if (roles.includes('HR')) return 'HR'
  if (roles.includes('MANAGER')) return 'MANAGER'
  return DEFAULT_ROLE
}

function isPrismaKnownError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function resolveRoleFromEntraGroups(entraObjectId: string): Promise<Role | null> {
  try {
    const groups = await getUserGroupsByObjectId(entraObjectId)
    const mappedRoles = groups
      .map((group) => ENTRA_GROUP_ROLE_MAP[group.displayName])
      .filter((role): role is Role => Boolean(role))

    if (!mappedRoles.length) return null
    return pickHighestPrivilegeRole(mappedRoles)
  } catch (err) {
    console.warn('[/api/auth/sync] Could not resolve role from Entra groups:', {
      entraObjectId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

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
    const normalizedEmail = email.trim().toLowerCase()
    if (!entraObjectId || !normalizedEmail) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const jobTitle = (body.jobTitle as string | undefined) ?? claimJobTitle

    try {
      const existsInAzure = await userExistsInAzureTenant({
        entraObjectId,
        email: normalizedEmail,
      })
      if (!existsInAzure) {
        return NextResponse.json(
          { error: 'User no longer exists in Azure tenant', code: 'USER_REMOVED_FROM_TENANT' },
          { status: 401 }
        )
      }
    } catch (azureCheckErr) {
      // Do not block sign-in when app-only Graph checks are temporarily unavailable.
      // The ID token is already verified against tenant + signature.
      console.warn('[/api/auth/sync] Azure existence check failed (continuing with token-verified identity):', {
        entraObjectId,
        email: normalizedEmail,
        error: azureCheckErr instanceof Error ? azureCheckErr.message : String(azureCheckErr),
      })
    }

    console.log('[/api/auth/sync] Azure login user:', { entraObjectId, email: normalizedEmail, displayName })

    const lookupFilters = [{ entraObjectId }, { workEmail: { equals: normalizedEmail } }]
    const existingUser = await prisma.employee.findFirst({
      where: {
        OR: lookupFilters,
      },
      select: { id: true, role: true, workEmail: true, entraObjectId: true },
    })

    console.log('[/api/auth/sync] DB lookup result:', existingUser ?? null)

    const roleFromEntra = await resolveRoleFromEntraGroups(entraObjectId)
    const resolvedRole = roleFromEntra ?? existingUser?.role ?? DEFAULT_ROLE

    // Fetch extended profile from Graph (mobilePhone, employeeHireDate, manager)
    // This runs in parallel with role resolution for performance
    const extendedProfile = await getUserExtendedProfile(entraObjectId).catch((err) => {
      console.warn('[/api/auth/sync] Could not fetch extended Graph profile (non-fatal):', err?.message)
      return { mobilePhone: null, employeeHireDate: null, jobTitle: null, mail: null, managerObjectId: null }
    })

    // Resolve managerId: look up the manager's DB record by their entraObjectId
    let resolvedManagerId: string | null = null
    if (extendedProfile.managerObjectId) {
      const managerRecord = await prisma.employee.findFirst({
        where: { entraObjectId: extendedProfile.managerObjectId },
        select: { id: true },
      })
      resolvedManagerId = managerRecord?.id ?? null
      if (!managerRecord) {
        console.warn('[/api/auth/sync] Manager entraObjectId not found in DB:', extendedProfile.managerObjectId)
      }
    }

    // Resolve hire date from Graph (preferred) or fall back to existing DB value
    let resolvedJoinDate: Date | undefined = undefined
    if (extendedProfile.employeeHireDate) {
      const parsed = new Date(extendedProfile.employeeHireDate)
      if (!isNaN(parsed.getTime())) {
        resolvedJoinDate = parsed
      }
    }

    // Resolve jobTitle: token claim takes priority, then Graph profile
    const resolvedJobTitle = jobTitle ?? extendedProfile.jobTitle ?? undefined

    const coreUserData = {
      workEmail:    normalizedEmail,
      displayName: displayName ?? email,
      firstName:   firstName ?? (displayName ? displayName.split(' ')[0] : email.split('@')[0]),
      lastName:    lastName  ?? '',
      role:        resolvedRole,
    }

    const optionalUserData = {
      jobTitle: resolvedJobTitle,
      phoneNumber: extendedProfile.mobilePhone ?? undefined,
      notificationEmail: extendedProfile.mail ?? null,
      ...(resolvedJoinDate    ? { joinDate:   resolvedJoinDate }    : {}),
      ...(resolvedManagerId !== undefined ? { managerId: resolvedManagerId } : {}),
    }

    // Determine if we should allow login/creation
    // We allow it if:
    // 1. The user already exists in our DB
    // 2. The user belongs to one of the authorized Azure groups
    if (!existingUser && !roleFromEntra) {
      console.warn('[/api/auth/sync] Login denied: user not in DB and no authorized Azure group found:', normalizedEmail)
      return NextResponse.json(
        { error: 'User not authorized. Please contact your manager to be added to the LMS groups in Azure.', code: 'USER_NOT_AUTHORIZED' },
        { status: 403 }
      )
    }

    let employee
    if (existingUser) {
      employee = await prisma.employee.update({
        where: { id: existingUser.id },
        data: coreUserData,
        select: { id: true, role: true, employmentStatus: true },
      })
    } else {
      try {
        employee = await prisma.employee.create({
          data: {
            ...coreUserData,
            entraObjectId,
          },
          select: { id: true, role: true, employmentStatus: true },
        })
      } catch (createErr) {
        // Resolve races/legacy duplicates by retrying as update when unique constraints trip.
        if (isPrismaKnownError(createErr) && createErr.code === 'P2002') {
          const conflicted = await prisma.employee.findFirst({
            where: {
              OR: [{ entraObjectId }, { workEmail: { equals: normalizedEmail } }],
            },
            select: { id: true },
          })

          if (!conflicted) {
            throw createErr
          }

          employee = await prisma.employee.update({
            where: { id: conflicted.id },
            data: {
              ...coreUserData,
              entraObjectId,
            },
            select: { id: true, role: true, employmentStatus: true },
          })
        } else {
          throw createErr
        }
      }
    }

    // Backfill optional profile fields without blocking sign-in on older DB schemas.
    try {
      await prisma.employee.update({
        where: { id: employee.id },
        data: optionalUserData,
      })
    } catch (optionalProfileErr) {
      console.warn('[/api/auth/sync] Optional profile update failed (non-fatal):', optionalProfileErr)
    }

    if (!existingUser) {
      console.log('[/api/auth/sync] Auto-onboarded new user from Azure:', { employeeId: employee.id, email: normalizedEmail, role: employee.role })
    }

    // Keep Azure object ID fresh when an existing record was matched by email.
    if (existingUser && existingUser.entraObjectId !== entraObjectId) {
      await prisma.employee.update({
        where: { id: existingUser.id },
        data: { entraObjectId },
      })
      console.log('[/api/auth/sync] Updated entraObjectId for existing user:', {
        employeeId: existingUser.id,
        oldEntraObjectId: existingUser.entraObjectId,
        newEntraObjectId: entraObjectId,
      })
    }

    // Use the employee's actual hire date from the DB, falling back to now() only for brand-new records
    const freshEmployee = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { joinDate: true },
    })
    const hireDate = freshEmployee?.joinDate ?? new Date()
    const currentYear = new Date().getFullYear()

    const proratedStandard  = calculateProratedLeaves(hireDate, 18, currentYear)
    const proratedFloater   = calculateProratedFloaterLeaves(hireDate, 2, currentYear)
    const proratedEmergency = calculateProratedEmergencyLeaves(hireDate, 2, currentYear)

    try {
      await prisma.leaveBalance.upsert({
        where: { employeeId: employee.id },
        create: {
          employeeId: employee.id,
          year: currentYear,
          standardTotal: proratedStandard,
          standardAccrued: proratedStandard,
          standardUsed: 0,
          standardCarryForward: 0,
          floaterTotal: proratedFloater,
          floaterUsed: 0,
          emergencyTotal: proratedEmergency,
          emergencyUsed: 0,
        },
        update: {
          // Recalculate totals on every login in case hire date was updated in Azure.
          // Keep usage/carry-forward untouched.
          year: currentYear,
          standardTotal: proratedStandard,
          floaterTotal: proratedFloater,
          emergencyTotal: proratedEmergency,
        },
      })
    } catch (balanceErr) {
      console.error('[/api/auth/sync] leaveBalance upsert failed (non-fatal):', balanceErr)
    }

    return NextResponse.json({
      role: normalizeRole(employee.role),
      employeeId: employee.id,
      created: !existingUser,
    })
  } catch (err) {
    console.error('[/api/auth/sync] Error:', err)
    if (isPrismaKnownError(err)) {
      if (err.code === 'P1001' || err.code === 'P1002') {
        return NextResponse.json(
          { error: 'Database is unavailable. Please try again shortly.', code: 'DB_UNREACHABLE' },
          { status: 503 }
        )
      }
      if (err.code === 'P2002') {
        return NextResponse.json(
          { error: 'User sync conflict detected. Please retry sign-in.', code: 'SYNC_CONFLICT' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: `Database error (${err.code})`, code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'Database initialization failed. Check DATABASE_URL and SSL settings.', code: 'DB_INIT_ERROR' },
        { status: 503 }
      )
    }

    if (err instanceof Prisma.PrismaClientUnknownRequestError) {
      return NextResponse.json(
        { error: 'Unexpected database error during sign-in sync.', code: 'DB_UNKNOWN_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Internal server error: ${toErrorMessage(err)}`, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
