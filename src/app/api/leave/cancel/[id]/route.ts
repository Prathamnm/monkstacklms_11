import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { isBefore } from 'date-fns'
import { logAudit } from '@/lib/audit/auditLogger'
import { sendMail } from '@/lib/email/acsMailer'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'
import { wrapEmailBody, detailRow, detailCard } from '@/lib/email/templates/shared'

async function cancelLeave(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    const { id } = params

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            workEmail: true,
            notificationEmail: true,
            managerId: true,
            manager: { select: { workEmail: true, notificationEmail: true, displayName: true } }
          }
        }
      }
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

    // If it was approved, reverse the balance deduction.
    if (wasPreviouslyApproved) {
      await prisma.$transaction([
        prisma.leaveLedgerEntry.create({
          data: {
            employeeId: token.userId,
            type: 'REVERSAL',
            days: Math.abs(leave.totalDays),
            reason: 'Leave cancelled by employee',
            referenceId: id,
            performedBy: token.userId,
            year: leave.startDate.getFullYear(),
          },
        }),
        prisma.leaveBalance.update({
          where: { employeeId: token.userId },
          data: leave.isEmergency
            ? { emergencyUsed: { decrement: Math.abs(leave.totalDays) } }
            : { standardUsed: { decrement: Math.abs(leave.totalDays) } },
        }),
      ])
    }

    await logAudit('LEAVE_CANCEL', token.userId, token.userId, {
      before: { status: leave.status },
      after: { status: 'CANCELLED' },
      params: { leaveId: id },
    }, req)

    // Send Emails
    const employee = leave.employee
    const hrEmployees = await prisma.employee.findMany({
      where: { role: { in: ['HR', 'ADMIN'] }, employmentStatus: 'ACTIVE' },
      select: { id: true, workEmail: true, notificationEmail: true, role: true },
    })

    const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    const startStr = fmtDate(leave.startDate)
    const endStr   = fmtDate(leave.endDate)

    const rows = [
      detailRow('Employee', employee.displayName),
      detailRow('Cancelled Period', `${startStr} – ${endStr}`),
      detailRow('Duration', `${leave.totalDays} day${leave.totalDays !== 1 ? 's' : ''}`),
    ].join('\n')

    const htmlBody = wrapEmailBody({
      preheader:  `${employee.displayName} has cancelled their leave request`,
      badgeText:  '🚫 Leave Cancelled',
      badgeColor: 'indigo',
      headline:   `${employee.displayName} cancelled their leave request`,
      bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                     The leave request below has been cancelled by the employee. No action is required.
                   </p>${detailCard(rows)}`,
    })
    const subject = `Leave Cancelled: ${employee.displayName} (${startStr} – ${endStr})`

    // To Manager
    const managerAddress = employee.manager ? getNotificationEmail(employee.manager) : null
    if (managerAddress) {
      await sendMail({ to: [managerAddress], subject, htmlBody }).catch(console.error)
    }

    // To HR/Admin
    for (const hr of hrEmployees) {
      const hrAddress = getNotificationEmail(hr)
      if (hrAddress === managerAddress) continue
      await sendMail({ to: [hrAddress], subject, htmlBody }).catch(console.error)
    }

    return NextResponse.json({ message: 'Leave request cancelled successfully' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    console.error('[/api/leave/cancel] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  return cancelLeave(req, ctx)
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  return cancelLeave(req, ctx)
}
