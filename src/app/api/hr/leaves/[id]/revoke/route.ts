import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { postReversal } from '@/lib/leave/ledgerService'
import { notifyLeaveRevoked } from '@/lib/notifications/notificationService'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { sendMail } from '@/lib/email/acsMailer'
import { buildLeaveStatusUpdateEmail } from '@/lib/email/templates/leaveStatusUpdate'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'
import { logAudit } from '@/lib/audit/auditLogger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await validateToken(req)
    requireRole(token, ['HR'])
    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Revocation reason is required', code: 'VALIDATION_ERROR' }, { status: 422 })
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, displayName: true, workEmail: true, notificationEmail: true, managerId: true } },
      },
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (leave.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only approved leaves can be revoked', code: 'INVALID_STATUS' }, { status: 422 })
    }

    if (token.role === 'HR') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const leaveStart = new Date(leave.startDate)
      leaveStart.setHours(0, 0, 0, 0)
      if (leaveStart.getTime() !== today.getTime()) {
        return NextResponse.json(
          { error: 'HR can only revoke a leave on its start date', code: 'TIMING_RESTRICTION' },
          { status: 422 }
        )
      }
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

    // Send email
    const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const employeeRef = leave.employee
    const employeeAddress = getNotificationEmail(employeeRef)

    // 1. Email to the employee
    const { subject: empSubject, htmlBody: empBody } = buildLeaveStatusUpdateEmail({
      employeeName:    employeeRef.displayName,
      startDate:       leave.startDate,
      endDate:         leave.endDate,
      totalDays:       leave.totalDays,
      status:          'REVOKED',
      reason:          leave.reason,
      approverComment: reason,
      appBaseUrl,
      leaveId:         id,
      recipientRole:   'EMPLOYEE',
    })
    await sendMail({ to: [employeeAddress], subject: empSubject, htmlBody: empBody }).catch(console.error)

    // 2. Inform other HR/Admin (excluding the person who triggered the revoke)
    const hrAdminList = await prisma.employee.findMany({
      where: {
        role: { in: ['HR'] },
        employmentStatus: 'ACTIVE',
        id: { not: token.userId },
      },
      select: { workEmail: true, notificationEmail: true },
    })

    if (hrAdminList.length > 0) {
      await sendMail({
        to: hrAdminList.map(h => getNotificationEmail(h)),
        subject: `[Copy] ${empSubject}`,
        htmlBody: empBody,
      }).catch(console.error)
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
