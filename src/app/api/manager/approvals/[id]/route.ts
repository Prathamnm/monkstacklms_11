import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { postUsage } from '@/lib/leave/ledgerService'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { sendMail } from '@/lib/email/acsMailer'
import { buildLeaveStatusUpdateEmail } from '@/lib/email/templates/leaveStatusUpdate'
import { buildLeaveApprovedBroadcastEmail } from '@/lib/email/templates/leaveApprovedBroadcast'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'
import { notifyLeaveApproved, notifyLeaveRejected } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const { id } = params
    const body = await req.json()
    const { action, reason } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action', code: 'BAD_REQUEST' }, { status: 400 })
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
          approverComments: reason || null,
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

      // 3. Send emails
      const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

      // Fetch additional data for emails
      const [approverProfile, broadcastRecipients] = await Promise.all([
        prisma.employee.findUnique({
          where: { id: token.userId },
          select: { displayName: true },
        }),
        // Broadcast: all team members (managerId === approver) + all HR + Admin
        prisma.employee.findMany({
          where: {
            employmentStatus: 'ACTIVE',
            OR: [
              { managerId: token.userId },
              { role: { in: ['HR'] } }
            ]
          },
          select: { workEmail: true, notificationEmail: true, role: true, displayName: true, jobTitle: true }
        })
      ])

      const employeeRef = leave.employee
      const employeeAddress = getNotificationEmail(employeeRef)

      // A. Personal confirmation to employee
      const { subject: empSub, htmlBody: empBody } = buildLeaveStatusUpdateEmail({
        employeeName:    employeeRef.displayName,
        startDate:       leave.startDate,
        endDate:         leave.endDate,
        totalDays:       leave.totalDays,
        status:          'APPROVED',
        reason:          leave.reason,
        approverComment: reason || null,
        appBaseUrl,
        leaveId:         id,
        recipientRole:   'EMPLOYEE',
      })
      await sendMail({ to: [employeeAddress], subject: empSub, htmlBody: empBody }).catch(console.error)

      // B. Broadcast to team + HR + Admin
      const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      const startStr = fmtDate(leave.startDate)
      const endStr   = fmtDate(leave.endDate)

      for (const recipient of broadcastRecipients) {
        const recipientAddress = getNotificationEmail(recipient)
        if (recipientAddress === employeeAddress) continue // skip self

        const { subject, htmlBody } = buildLeaveApprovedBroadcastEmail({
          employeeName: employeeRef.displayName,
          jobTitle:     (employeeRef as any).jobTitle ?? null,
          startDate:    startStr,
          endDate:      endStr,
          totalDays:    leave.totalDays,
          approverName: approverProfile?.displayName ?? 'Manager',
          appBaseUrl,
          recipientRole: recipient.role as any,
        })
        await sendMail({ to: [recipientAddress], subject, htmlBody }).catch(console.error)
      }

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

      // Send email
      const employeeRef = leave.employee
      const employeeAddress = getNotificationEmail(employeeRef)
      const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

      const { subject: rejSubject, htmlBody: rejBody } = buildLeaveStatusUpdateEmail({
        employeeName:    employeeRef.displayName,
        startDate:       leave.startDate,
        endDate:         leave.endDate,
        totalDays:       leave.totalDays,
        status:          'REJECTED',
        reason:          leave.reason,
        approverComment: reason,
        appBaseUrl,
        leaveId:         id,
        recipientRole:   'EMPLOYEE',
      })
      await sendMail({ to: [employeeAddress], subject: rejSubject, htmlBody: rejBody }).catch(console.error)
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
