import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'
import { logAudit } from '@/lib/audit/auditLogger'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { id } = params
    const today = new Date()

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        leaveRequests: {
          where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
        },
        projectMemberships: {
          where: { isActive: true },
          include: { project: { select: { id: true, name: true, code: true, color: true } } },
        },
        leaveBalance: true,
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const availabilityStatus = getAvailabilityForDate(
      employee.leaveRequests.map((lr) => ({
        startDate: lr.startDate,
        endDate: lr.endDate,
        startHalfDay: lr.startHalfDay,
        endHalfDay: lr.endHalfDay,
        status: lr.status,
      })),
      today
    )

    return NextResponse.json({
      id: employee.id,
      entraObjectId: employee.entraObjectId,
      email: employee.email,
      displayName: employee.displayName,
      firstName: employee.firstName,
      lastName: employee.lastName,
      jobTitle: employee.jobTitle,
      department: employee.department,
      phoneNumber: employee.phoneNumber,
      profilePictureUrl: employee.profilePictureUrl,
      role: employee.role,
      employmentStatus: employee.employmentStatus,
      managerId: employee.managerId,
      joinDate: employee.joinDate.toISOString(),
      terminationDate: employee.terminationDate?.toISOString() ?? null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      availabilityStatus,
      projects: employee.projectMemberships.map((pm) => pm.project),
      leaveBalance: employee.leaveBalance,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { id } = params
    const body = await req.json()

    const before = await prisma.employee.findUnique({ where: { id } })

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phoneNumber: body.phoneNumber,
        jobTitle: body.jobTitle,
        department: body.department,
        role: body.role,
        managerId: body.managerId,
      },
    })

    await logAudit('EMPLOYEE_UPDATE', token.userId, id, {
      before,
      after: employee,
      params: {},
    }, req)

    return NextResponse.json({
      ...employee,
      joinDate: employee.joinDate.toISOString(),
      terminationDate: employee.terminationDate?.toISOString() ?? null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
