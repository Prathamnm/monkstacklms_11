import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { Role } from '@prisma/client'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'
import { logAudit } from '@/lib/audit/auditLogger'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const { id } = params

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, displayName: true } },
        leaveBalance: true,
        leaveRequests: {
          where: { status: 'APPROVED', startDate: { lte: todayEnd }, endDate: { gte: today } },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
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
      ...employee,
      availabilityStatus,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const body = await req.json()
    const {
      emergencyName,
      emergencyRelation,
      emergencyPhone,
      employmentStatus,
      notificationEmail,
    } = body
    // Azure-synced fields (jobTitle, managerId, phoneNumber, firstName, lastName, displayName) 
    // are NOT accepted here.

    const employeeId = params.id
    const prevEmployee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!prevEmployee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        emergencyName:     emergencyName     ?? undefined,
        emergencyRelation: emergencyRelation ?? undefined,
        emergencyPhone:    emergencyPhone    ?? undefined,
        employmentStatus:  employmentStatus  ?? undefined,
        notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
      },
    })

    await logAudit('EMPLOYEE_UPDATE', token.userId, employeeId, {
      before: {
        emergencyName:     prevEmployee.emergencyName,
        emergencyRelation: prevEmployee.emergencyRelation,
        emergencyPhone:    prevEmployee.emergencyPhone,
        employmentStatus:  prevEmployee.employmentStatus,
      },
      after: {
        emergencyName, emergencyRelation, emergencyPhone, employmentStatus, notificationEmail,
      },
      params: { reason: 'HR update of non-synced fields' }
    }, req)

    return NextResponse.json(updatedEmployee)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
