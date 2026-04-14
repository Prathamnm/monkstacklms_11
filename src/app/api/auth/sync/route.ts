import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { verifyIdTokenFromRequest } from '@/lib/auth/validateToken'

const DEFAULT_ROLE: Role = 'EMPLOYEE'

function normalizeRole(role: unknown): Role {
  return role === 'MANAGER' || role === 'HR' || role === 'ADMIN' ? role : DEFAULT_ROLE
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
    const body = await req.json().catch(() => ({}))
    const jobTitle = (body.jobTitle as string | undefined) ?? claimJobTitle

    console.log('[/api/auth/sync] Azure login user:', { entraObjectId, email: normalizedEmail, displayName })

    const existingUser = await prisma.employee.findFirst({
      where: {
        OR: [
          { entraObjectId },
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
        ],
      },
      select: { id: true, role: true, email: true, entraObjectId: true },
    })

    console.log('[/api/auth/sync] DB lookup result:', existingUser ?? null)

    const userData = {
      email: normalizedEmail,
      displayName: displayName ?? email,
      firstName: firstName ?? (displayName ? displayName.split(' ')[0] : email.split('@')[0]),
      lastName: lastName ?? '',
      jobTitle,
    }

    const employee = existingUser
      ? await prisma.employee.update({
          where: { id: existingUser.id },
          data: userData,
          select: { id: true, role: true, employmentStatus: true },
        })
      : await prisma.employee.create({
          data: {
            entraObjectId,
            ...userData,
            role: DEFAULT_ROLE,
            employmentStatus: 'ACTIVE',
          },
          select: { id: true, role: true, employmentStatus: true },
        })

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

    if (!existingUser) {
      console.log('[/api/auth/sync] Created new DB user:', { employeeId: employee.id, email: normalizedEmail, role: employee.role })
    }

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

    return NextResponse.json({
      role: normalizeRole(employee.role),
      employeeId: employee.id,
      created: !existingUser,
    })
  } catch (err) {
    console.error('[/api/auth/sync] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
