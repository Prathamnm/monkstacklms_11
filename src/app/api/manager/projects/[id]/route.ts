import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN', 'HR'])

    const { id } = params
    const today = new Date()

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            employee: {
              include: {
                leaveRequests: {
                  where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
                },
              },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const members = project.members.map((m) => {
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
          department: m.employee.department,
          profilePictureUrl: m.employee.profilePictureUrl,
          role: m.employee.role,
          employmentStatus: m.employee.employmentStatus,
          availabilityStatus,
        },
      }
    })

    const availableMembersCount = members.filter((m) => m.employee.availabilityStatus === 'AVAILABLE').length

    return NextResponse.json({
      id: project.id,
      name: project.name,
      code: project.code,
      description: project.description,
      color: project.color,
      isActive: project.isActive,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      members,
      availableMembersCount,
      totalMembersCount: members.length,
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
    requireRole(token, ['MANAGER', 'ADMIN'])

    const { id } = params
    const body = await req.json()

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
        isActive: body.isActive,
      },
    })

    return NextResponse.json({
      ...project,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
