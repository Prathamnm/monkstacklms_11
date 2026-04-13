import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)

    // Find all projects this employee is on
    const myProjectIds = await prisma.employeeProject.findMany({
      where: { employeeId: token.userId, isActive: true },
      select: { projectId: true },
    })

    if (!myProjectIds.length) return NextResponse.json([])

    // Find all teammates (employees in the same projects, excluding self)
    const teammates = await prisma.employee.findMany({
      where: {
        id: { not: token.userId },
        employmentStatus: 'ACTIVE',
        projectMemberships: {
          some: {
            projectId: { in: myProjectIds.map((p) => p.projectId) },
            isActive: true,
          },
        },
      },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
        projectMemberships: {
          where: { isActive: true },
          include: { project: { select: { id: true, name: true, code: true, color: true } } },
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
        email: emp.email,
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
        projects: emp.projectMemberships.map((pm) => pm.project),
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
