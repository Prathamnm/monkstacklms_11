import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { postReversal } from '@/lib/leave/ledgerService'
import { notifyLeaveRevoked } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'
import { formatDateRange } from '@/lib/utils/dateUtils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { id } = params
    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Revocation reason is required', code: 'VALIDATION_ERROR' }, { status: 422 })
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

    if (leave.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only approved leaves can be revoked', code: 'INVALID_STATUS' }, { status: 422 })
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: token.userId,
        revocationReason: reason,
      },
    })

    // Restore balance
    await postReversal({
      employeeId: leave.employeeId,
      days: leave.totalDays,
      reason: `Leave revoked by HR/Admin: ${reason}`,
      referenceId: id,
      performedBy: token.userId,
      year: leave.startDate.getFullYear(),
    })

    const dates = formatDateRange(leave.startDate.toISOString(), leave.endDate.toISOString())

    if (leave.employee.managerId) {
      await notifyLeaveRevoked(
        leave.employeeId,
        leave.employee.managerId,
        token.userId,
        id,
        dates
      )
    }

    await logAudit('LEAVE_REVOKE', token.userId, leave.employeeId, {
      before: { status: 'APPROVED' },
      after: { status: 'REVOKED' },
      params: { leaveId: id, reason },
    }, req)

    return NextResponse.json({ message: 'Leave revoked successfully' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
