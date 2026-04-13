import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)

    const employeeProjects = await prisma.employeeProject.findMany({
      where: { employeeId: token.userId, isActive: true },
      include: {
        project: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                employee: {
                  include: {
                    leaveRequests: {
                      where: {
                        status: 'APPROVED',
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const today = new Date()

    const projects = employeeProjects.map((ep) => {
      const members = ep.project.members.map((m) => {
        const availabilityStatus = getAvailabilityForDate(
          m.employee.leaveRequests.map((lr) => ({
            startDate: lr.startDate,
            endDate: lr.endDate,
            startHalfDay: lr.startHalfDay,
            endHalfDay: lr.endHalfDay,
            status: lr.status,
          })),
          today
        )
        return {
          id: m.id,
          employeeId: m.employeeId,
          projectId: m.projectId,
          assignedAt: m.assignedAt.toISOString(),
          isActive: m.isActive,
          employee: {
            id: m.employee.id,
            displayName: m.employee.displayName,
            email: m.employee.email,
            jobTitle: m.employee.jobTitle,

            profilePictureUrl: m.employee.profilePictureUrl,
            availabilityStatus,
          },
        }
      })

      const availableMembersCount = members.filter((m) => m.employee.availabilityStatus === 'AVAILABLE').length

      return {
        id: ep.project.id,
        name: ep.project.name,
        code: ep.project.code,
        description: ep.project.description,
        color: ep.project.color,
        isActive: ep.project.isActive,
        startDate: ep.project.startDate?.toISOString(),
        endDate: ep.project.endDate?.toISOString(),
        createdAt: ep.project.createdAt.toISOString(),
        updatedAt: ep.project.updatedAt.toISOString(),
        members,
        availableMembersCount,
        totalMembersCount: members.length,
      }
    })

    return NextResponse.json(projects)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    console.error('[/api/employee/projects] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
