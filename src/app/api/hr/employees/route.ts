import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const employees = await prisma.employee.findMany({
      where: statusFilter ? { employmentStatus: statusFilter as 'ACTIVE' | 'INACTIVE' | 'TERMINATED' } : undefined,
      include: {
        manager: { select: { id: true, displayName: true } },
        leaveRequests: {
          where: { status: 'APPROVED', startDate: { lte: todayEnd }, endDate: { gte: today } },
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
        entraObjectId: emp.entraObjectId,
        email: emp.workEmail,
        workEmail: emp.workEmail,
        notificationEmail: emp.notificationEmail,
        displayName: emp.displayName,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        phoneNumber: emp.phoneNumber,
        emergencyName: (emp as any).emergencyName,
        emergencyRelation: (emp as any).emergencyRelation,
        emergencyPhone: (emp as any).emergencyPhone,
        profilePictureUrl: emp.profilePictureUrl,
        role: emp.role,
        employmentStatus: emp.employmentStatus,
        managerId: emp.managerId,
        managerName: emp.manager?.displayName ?? null,
        joinDate: emp.joinDate.toISOString(),
        terminationDate: emp.terminationDate?.toISOString() ?? null,
        createdAt: emp.createdAt.toISOString(),
        updatedAt: emp.updatedAt.toISOString(),
        availabilityStatus,
      }
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
