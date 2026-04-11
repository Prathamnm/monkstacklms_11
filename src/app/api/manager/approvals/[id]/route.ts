import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { postUsage } from '@/lib/leave/ledgerService'
import { notifyLeaveApproved, notifyLeaveRejected } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'
import { formatDateRange } from '@/lib/utils/dateUtils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN'])

    const { id } = params
    const body = await req.json()
    const { action, reason } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, displayName: true, managerId: true } },
      },
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json({ error: 'Leave is no longer pending', code: 'INVALID_STATUS' }, { status: 422 })
    }

    const dates = formatDateRange(leave.startDate.toISOString(), leave.endDate.toISOString())

    if (action === 'approve') {
      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: token.userId,
          approvedAt: new Date(),
        },
      })

      // Deduct balance via ledger
      await postUsage({
        employeeId: leave.employeeId,
        days: leave.totalDays,
        reason: `Leave approved by ${token.email}`,
        referenceId: id,
        performedBy: token.userId,
        year: leave.startDate.getFullYear(),
        month: leave.startDate.getMonth() + 1,
      })

      await notifyLeaveApproved(leave.employeeId, token.userId, id, dates)
      await logAudit('LEAVE_APPROVE', token.userId, leave.employeeId, {
        before: { status: 'PENDING' },
        after: { status: 'APPROVED' },
        params: { leaveId: id },
      }, req)

    } else {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required', code: 'VALIDATION_ERROR' }, { status: 422 })
      }

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: token.userId,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      })

      await notifyLeaveRejected(leave.employeeId, token.userId, id, dates)
      await logAudit('LEAVE_REJECT', token.userId, leave.employeeId, {
        before: { status: 'PENDING' },
        after: { status: 'REJECTED' },
        params: { leaveId: id, reason },
      }, req)
    }

    return NextResponse.json({ message: `Leave ${action}d successfully` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    console.error('[/api/manager/approvals/[id]] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
