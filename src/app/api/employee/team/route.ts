import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)

    // Find the current user to get their managerId
    const currentUser = await prisma.employee.findUnique({
      where: { id: token.userId },
      select: { managerId: true }
    })

    if (!currentUser) return NextResponse.json([])

    // Find all teammates (employees with the same manager, or subordinates if the user is a manager)
    // For now, let's define teammates as people with the same managerId
    const teammates = await prisma.employee.findMany({
      where: {
        OR: [
          { managerId: currentUser.managerId, id: { not: token.userId } },
          { managerId: token.userId }
        ],
        employmentStatus: 'ACTIVE',
      },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      },
    })

    const today = new Date()

    const result = teammates.map((emp) => {
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

      const currentLeave = emp.leaveRequests[0]

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
        profilePictureUrl: emp.profilePictureUrl,
        role: emp.role,
        employmentStatus: emp.employmentStatus,
        managerId: emp.managerId,
        joinDate: emp.joinDate.toISOString(),
        createdAt: emp.createdAt.toISOString(),
        updatedAt: emp.updatedAt.toISOString(),
        availabilityStatus,
        currentLeaveEnd: currentLeave?.endDate.toISOString() ?? null,
        projects: [], // Projects model removed from system
      }
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    console.error('[/api/employee/team] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
