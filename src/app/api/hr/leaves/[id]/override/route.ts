import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { sendMail } from '@/lib/email/acsMailer'
import { buildLeaveStatusUpdateEmail } from '@/lib/email/templates/leaveStatusUpdate'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

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
        employee: { select: { id: true, displayName: true, workEmail: true, notificationEmail: true, managerId: true } },
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

    // Create ledger entry if approving and not already existing
    if (action === 'approve') {
      const existingEntry = await prisma.leaveLedgerEntry.findFirst({
        where: { referenceId: leave.id, type: 'USAGE' }
      })

      if (!existingEntry) {
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

    const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const employeeAddress = getNotificationEmail(leave.employee)

    const { subject: empSubject, htmlBody: empBody } = buildLeaveStatusUpdateEmail({
      employeeName:    leave.employee.displayName,
      startDate:       leave.startDate,
      endDate:         leave.endDate,
      totalDays:       leave.totalDays,
      status:          newStatus as 'APPROVED' | 'REJECTED',
      reason:          leave.reason,
      approverComment: `[Admin Override] ${reason}`,
      appBaseUrl,
      leaveId:         leave.id,
      recipientRole:   'EMPLOYEE',
    })
    await sendMail({ to: [employeeAddress], subject: empSubject, htmlBody: empBody }).catch(console.error)

    if (leave.employee.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: leave.employee.managerId },
        select: { workEmail: true, notificationEmail: true },
      })
      if (manager) {
        const managerAddress = getNotificationEmail(manager)
        const { subject: mgrSubject, htmlBody: mgrBody } = buildLeaveStatusUpdateEmail({
          employeeName:    leave.employee.displayName,
          startDate:       leave.startDate,
          endDate:         leave.endDate,
          totalDays:       leave.totalDays,
          status:          newStatus as 'APPROVED' | 'REJECTED',
          reason:          leave.reason,
          approverComment: `[Admin Override] ${reason}`,
          appBaseUrl,
          leaveId:         leave.id,
          recipientRole:   'MANAGER',
        })
        await sendMail({ to: [managerAddress], subject: mgrSubject, htmlBody: mgrBody }).catch(console.error)
      }
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
