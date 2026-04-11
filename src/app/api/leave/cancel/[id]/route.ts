import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { isBefore } from 'date-fns'
import { postReversal } from '@/lib/leave/ledgerService'
import { logAudit } from '@/lib/audit/auditLogger'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    const { id } = params

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (leave.employeeId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    if (leave.status !== 'PENDING' && leave.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Cannot cancel this leave request', code: 'INVALID_STATUS' }, { status: 422 })
    }

    if (!isBefore(new Date(), leave.startDate)) {
      return NextResponse.json({ error: 'Cannot cancel leave that has already started. Contact HR.', code: 'LEAVE_STARTED' }, { status: 422 })
    }

    const wasPreviouslyApproved = leave.status === 'APPROVED'

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    // If it was approved, reverse the balance deduction
    if (wasPreviouslyApproved) {
      await postReversal({
        employeeId: token.userId,
        days: leave.totalDays,
        reason: 'Leave cancelled by employee',
        referenceId: id,
        year: leave.startDate.getFullYear(),
      })
    }

    await logAudit('LEAVE_CANCEL', token.userId, token.userId, {
      before: { status: leave.status },
      after: { status: 'CANCELLED' },
      params: { leaveId: id },
    }, req)

    return NextResponse.json({ message: 'Leave request cancelled successfully' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    console.error('[/api/leave/cancel] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
