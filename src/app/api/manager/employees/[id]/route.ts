import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, displayName: true, workEmail: true } },
        leaveBalance: true,
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            approver: { select: { id: true, displayName: true, workEmail: true } },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const result = {
      id: employee.id,
      entraObjectId: employee.entraObjectId,
      email: employee.workEmail,
      workEmail: employee.workEmail,
      notificationEmail: employee.notificationEmail,
      displayName: employee.displayName,
      firstName: employee.firstName,
      lastName: employee.lastName,
      jobTitle: employee.jobTitle,
      phoneNumber: employee.phoneNumber,
      emergencyName: employee.emergencyName,
      emergencyRelation: employee.emergencyRelation,
      emergencyPhone: employee.emergencyPhone,
      profilePictureUrl: employee.profilePictureUrl,
      role: employee.role,
      employmentStatus: employee.employmentStatus,
      managerId: employee.managerId,
      manager: employee.manager,
      joinDate: employee.joinDate.toISOString(),
      terminationDate: employee.terminationDate?.toISOString() ?? null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      leaveBalance: employee.leaveBalance
        ? {
            year: employee.leaveBalance.year,
            standardTotal: employee.leaveBalance.standardTotal,
            standardUsed: employee.leaveBalance.standardUsed,
            standardCarryForward: employee.leaveBalance.standardCarryForward,
            availableStandard:
              employee.leaveBalance.standardTotal +
              employee.leaveBalance.standardCarryForward -
              employee.leaveBalance.standardUsed,
            emergencyTotal: employee.leaveBalance.emergencyTotal,
            emergencyUsed: employee.leaveBalance.emergencyUsed,
            availableEmergency: employee.leaveBalance.emergencyTotal - employee.leaveBalance.emergencyUsed,
          }
        : null,
      leaveRequests: employee.leaveRequests.map((lr) => ({
        id: lr.id,
        title: lr.title,
        startDate: lr.startDate.toISOString(),
        endDate: lr.endDate.toISOString(),
        totalDays: lr.totalDays,
        reason: lr.reason,
        status: lr.status,
        isEmergency: lr.isEmergency,
        approver: lr.approver ? { ...lr.approver, email: (lr.approver as any).workEmail } : null,
        rejectionReason: lr.rejectionReason,
        createdAt: lr.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
