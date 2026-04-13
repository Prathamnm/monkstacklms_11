import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    const body = await req.json()
    const { action, reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'reason is required for admin override' }, { status: 400 })
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        employee: { select: { id: true, displayName: true, email: true, managerId: true } },
      },
    })

    if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

    const now = new Date()
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        approverId: token.userId,
        approvedAt: action === 'approve' ? now : null,
        rejectedAt: action === 'reject' ? now : null,
        rejectionReason: action === 'reject' ? `[Admin Override] ${reason}` : null,
      },
    })

    // Create ledger entry if approving
    if (action === 'approve') {
      await prisma.leaveLedgerEntry.create({
        data: {
          employeeId: leave.employeeId,
          type: 'USAGE',
          days: leave.totalDays,
          reason: `Admin override approval: ${reason}`,
          referenceId: leave.id,
          performedBy: token.userId,
          year: now.getFullYear(),
        },
      })

      await prisma.leaveBalance.update({
        where: { employeeId: leave.employeeId },
        data: {
          ...(leave.isEmergency
            ? { emergencyUsed: { increment: leave.totalDays } }
            : { standardUsed: { increment: leave.totalDays } }),
        },
      })
    }

    // Notify employee
    await prisma.notification.create({
      data: {
        type: action === 'approve' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        title: `[System Override] Leave ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your leave request has been ${newStatus.toLowerCase()} via admin override. Reason: ${reason}`,
        recipientId: leave.employeeId,
        senderId: token.userId,
        referenceId: leave.id,
      },
    })

    // Notify manager if exists
    if (leave.employee.managerId) {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: `[System Override] Leave ${newStatus}`,
          message: `Leave request for ${leave.employee.displayName} has been ${newStatus.toLowerCase()} via admin override.`,
          recipientId: leave.employee.managerId,
          senderId: token.userId,
          referenceId: leave.id,
        },
      })
    }

    await logAudit('ADMIN_OVERRIDE', token.userId, leave.employeeId, {
      before: { status: leave.status },
      after: { status: newStatus, action, reason, overrideFlag: true },
      params: {},
    }, req)

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
