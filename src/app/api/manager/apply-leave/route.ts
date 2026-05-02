import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { countBusinessDays, formatDateRange } from '@/lib/utils/dateUtils'
import { format, parseISO } from 'date-fns'
import { validateSandwichRule } from '@/lib/leave/leaveValidator'
import { createNotifications } from '@/lib/notifications/notificationService'
import { sendMail } from '@/lib/email/acsMailer'
import { buildManagerOnLeaveEmail } from '@/lib/email/templates/managerOnLeave'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER'])

    const body = await req.json()
    const { title, startDate, endDate, startHalfDay = 'NONE', endHalfDay = 'NONE', halfDayDates = [], dayOverrides = [], totalDays, reason, isEmergency = false } = body

    const normalizedStartHalfDay = startHalfDay === 'NONE' ? 'NONE' : 'HALF_DAY'
    const normalizedEndHalfDay = endHalfDay === 'NONE' ? 'NONE' : 'HALF_DAY'

    if (!title || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'title, startDate, endDate, and reason are required' }, { status: 400 })
    }

    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      return NextResponse.json({ error: 'Leave cannot start in the past' }, { status: 400 })
    }

    // Check for overlapping leaves
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: token.userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    })

    if (overlap) {
      return NextResponse.json({ error: 'You already have a leave in this period' }, { status: 409 })
    }

    const holidaysForSandwich = await prisma.publicHoliday.findMany({ select: { date: true } })
    const sandwichCheck = validateSandwichRule(
      start,
      end,
      holidaysForSandwich.map((h) => ({ date: format(h.date, 'yyyy-MM-dd') }))
    )
    if (!sandwichCheck.valid) {
      return NextResponse.json({ error: sandwichCheck.error, code: 'SANDWICH_RULE' }, { status: 422 })
    }

    // Fetch public holidays in range
    const publicHolidays = await prisma.publicHoliday.findMany({
      where: { date: { gte: start, lte: end } },
    })
    const holidayDates = publicHolidays.map((h) => h.date.toDateString())

    // Use totalDays from request if provided, otherwise compute it
    let calculatedTotalDays = totalDays
    if (typeof totalDays !== 'number' || totalDays <= 0) {
      // Fallback to original calculation for backward compatibility
      calculatedTotalDays = countBusinessDays(start, end, holidayDates)
      // Apply half-day adjustments
      if (normalizedStartHalfDay !== 'NONE') calculatedTotalDays -= 0.5
      if (normalizedEndHalfDay !== 'NONE' && end.toDateString() !== start.toDateString()) calculatedTotalDays -= 0.5
      calculatedTotalDays = Math.max(0.5, calculatedTotalDays)
    }

    // Check balance
    const balance = await prisma.leaveBalance.findUnique({ where: { employeeId: token.userId } })
    if (!balance) return NextResponse.json({ error: 'No leave balance found' }, { status: 400 })

    if (isEmergency) {
      if (calculatedTotalDays > 2) {
        return NextResponse.json(
          { error: 'Emergency leave can be applied for a maximum of 2 consecutive days.' },
          { status: 400 }
        )
      }
      const availableStandard = balance.standardTotal + balance.standardCarryForward - balance.standardUsed
      if (calculatedTotalDays > availableStandard) {
        return NextResponse.json({ error: `Insufficient balance. You have ${availableStandard} days remaining.` }, { status: 400 })
      }
    } else {
      const availableStandard = balance.standardTotal + balance.standardCarryForward - balance.standardUsed
      if (calculatedTotalDays > availableStandard) {
        return NextResponse.json({ error: `Insufficient balance. You have ${availableStandard} days remaining.` }, { status: 400 })
      }
    }

    const now = new Date()

    // Create leave request as APPROVED (manager self-approves)
    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: token.userId,
        title,
        startDate: start,
        endDate: end,
        startHalfDay: normalizedStartHalfDay,
        endHalfDay: normalizedEndHalfDay,
        halfDayDates: Array.isArray(halfDayDates) ? halfDayDates : [],
        dayOverrides: Array.isArray(dayOverrides) ? dayOverrides : [],
        totalDays: calculatedTotalDays,
        reason,
        isEmergency,
        status: 'APPROVED',
        approverId: token.userId,
        approvedAt: now,
      },
    })

    // Fetch manager's profile + all recipients (Direct Reports + HR/Admin)
    const [managerProfile, emailRecipients] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: token.userId },
        select: { displayName: true, workEmail: true, notificationEmail: true, jobTitle: true },
      }),
      prisma.employee.findMany({
        where: {
          employmentStatus: 'ACTIVE',
          OR: [
            { managerId: token.userId },           // direct reports
            { role: { in: ['HR', 'ADMIN'] } },    // HR and Admin
          ],
        },
        select: { id: true, workEmail: true, notificationEmail: true, role: true },
      }),
    ])

    const dateLabel = formatDateRange(startDate, endDate)
    const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // 1. Email Notifications
    const recipientEmails = Array.from(new Set(
      emailRecipients
        .map(r => getNotificationEmail(r))
        .filter(e => e !== getNotificationEmail(managerProfile as any))
    ))

    if (recipientEmails.length > 0) {
      const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      const { subject, htmlBody } = buildManagerOnLeaveEmail({
        managerName: managerProfile?.displayName ?? 'Your manager',
        jobTitle:    managerProfile?.jobTitle    ?? null,
        startDate:   fmtDate(start),
        endDate:     fmtDate(end),
        totalDays:   leave.totalDays,
        appBaseUrl,
      })
      await sendMail({ to: recipientEmails, subject, htmlBody }).catch(console.error)
    }

    // 2. In-app Notifications
    if (emailRecipients.length > 0) {
      await createNotifications(
        emailRecipients.map((recipient) => ({
          type: 'LEAVE_APPLIED',
          title: 'Manager Leave Notice',
          message: `${managerProfile?.displayName ?? 'A manager'} is on leave for ${dateLabel} (auto-approved).`,
          recipientId: recipient.id,
          senderId: token.userId,
          referenceId: leave.id,
        }))
      )
    }

    // Create ledger entry
    await prisma.leaveLedgerEntry.create({
      data: {
        employeeId: token.userId,
        type: 'USAGE',
        days: calculatedTotalDays,
        reason: `Manager self-approved leave: ${title}`,
        referenceId: leave.id,
        performedBy: token.userId,
        year: now.getFullYear(),
      },
    })

    // Update balance
    await prisma.leaveBalance.update({
      where: { employeeId: token.userId },
      data: { standardUsed: { increment: calculatedTotalDays } },
    })

    await logAudit('LEAVE_APPROVE', token.userId, token.userId, {
      before: {},
      after: { leaveId: leave.id, totalDays: calculatedTotalDays, selfApproved: true, note: 'self-approved by manager' },
      params: {},
    }, req)

    return NextResponse.json(leave, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
