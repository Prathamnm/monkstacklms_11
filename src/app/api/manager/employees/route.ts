import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN'])

    const today = new Date()

    const employees = await prisma.employee.findMany({
      where: {
        managerId: token.role === 'ADMIN' ? undefined : token.userId,
        employmentStatus: 'ACTIVE',
      },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { lte: today },
            endDate: { gte: today },
          },
        },
        projectMemberships: {
          where: { isActive: true },
          include: { project: { select: { id: true, name: true, code: true, color: true } } },
        },
      },
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
        email: emp.email,
        displayName: emp.displayName,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        department: emp.department,
        profilePictureUrl: emp.profilePictureUrl,
        role: emp.role,
        employmentStatus: emp.employmentStatus,
        managerId: emp.managerId,
        joinDate: emp.joinDate.toISOString(),
        createdAt: emp.createdAt.toISOString(),
        updatedAt: emp.updatedAt.toISOString(),
        availabilityStatus,
        projects: emp.projectMemberships.map((pm) => pm.project),
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
