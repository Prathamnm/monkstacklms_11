import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { postEmergencyGrant } from '@/lib/leave/ledgerService'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const body = await req.json()
    const { firstName, lastName, email, phoneNumber, designation, role, startDate, managerId } = body

    if (!firstName || !lastName || !email || !designation) {
      return NextResponse.json(
        { error: 'First name, last name, email, and designation are required', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    if (!email.endsWith('@monikajadhav1907gmail.onmicrosoft.com')) {
      return NextResponse.json(
        { error: 'Email must use the company domain @monikajadhav1907gmail.onmicrosoft.com', code: 'INVALID_EMAIL' },
        { status: 400 }
      )
    }

    const year = new Date().getFullYear()

    // Create employee with a placeholder entraObjectId (will be updated on first login)
    const employee = await prisma.employee.create({
      data: {
        entraObjectId: `pending-${email}`,
        email,
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phoneNumber,
        jobTitle: designation,
        designation,
        role: role ?? 'EMPLOYEE',
        employmentStatus: 'ACTIVE',
        joinDate: startDate ? new Date(startDate) : new Date(),
        managerId: managerId || null,
      },
    })

    // Initialize leave balance
    await prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year,
        standardTotal: 18,
        standardAccrued: 0,
        standardUsed: 0,
        standardCarryForward: 0,
        emergencyTotal: 2,
        emergencyUsed: 0,
      },
    })

    // Grant emergency leave
    await postEmergencyGrant({
      employeeId: employee.id,
      days: 2,
      reason: 'Initial emergency leave grant on onboarding',
      year,
    })

    await logAudit('EMPLOYEE_ONBOARD', token.userId, employee.id, {
      before: {},
      after: { employeeId: employee.id, email, role: employee.role },
      params: {},
    }, req)

    return NextResponse.json({ id: employee.id, message: 'Employee onboarded successfully' }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'An employee with this email already exists', code: 'DUPLICATE_EMAIL' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
