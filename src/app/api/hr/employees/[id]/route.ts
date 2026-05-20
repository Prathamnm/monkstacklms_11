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
    requireRole(token, ['HR'])

    const { id } = params

    if (id === '0') {
      const today = new Date()
      const employees = await prisma.employee.findMany({
        include: {
          manager: { select: { id: true, displayName: true } },
          leaveRequests: {
            where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
          },
        },
        orderBy: { firstName: 'asc' },
      })

      const result = employees.map((emp) => {
        const availabilityStatus = getAvailabilityForDate(
          emp.leaveRequests.map((lr) => ({
            startDate: lr.startDate,
            endDate: lr.endDate,
            startHalfDay: lr.startHalfDay,
            endHalfDay: lr.endHalfDay,
            status: lr.status,
          })),
          today
        )

        return {
          id: emp.id,
          displayName: emp.displayName,
          email: emp.workEmail,
          workEmail: emp.workEmail,
          role: emp.role,
          jobTitle: emp.jobTitle,
          employmentStatus: emp.employmentStatus,
          managerName: emp.manager?.displayName ?? null,
          availabilityStatus,
          timeZone: emp.timeZone,
          joinDate: emp.joinDate.toISOString(),
          createdAt: emp.createdAt.toISOString(),
        }
      })
      return NextResponse.json(result)
    }

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
      timeZone,
    } = body
    // Azure-synced fields (jobTitle, managerId, phoneNumber, firstName, lastName, displayName) 
    // are NOT accepted here.

    const employeeId = params.id
    const prevEmployee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!prevEmployee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        emergencyName: emergencyName ?? undefined,
        emergencyRelation: emergencyRelation ?? undefined,
        emergencyPhone: emergencyPhone ?? undefined,
        employmentStatus: employmentStatus ?? undefined,
        notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
        timeZone: timeZone ?? undefined,
      },
    })

    await logAudit('EMPLOYEE_UPDATE', token.userId, employeeId, {
      before: {
        emergencyName: prevEmployee.emergencyName,
        emergencyRelation: prevEmployee.emergencyRelation,
        emergencyPhone: prevEmployee.emergencyPhone,
        employmentStatus: prevEmployee.employmentStatus,
      },
      after: {
        emergencyName, emergencyRelation, emergencyPhone, employmentStatus, notificationEmail, timeZone,
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
