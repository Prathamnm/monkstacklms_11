import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { format, isWeekend, parseISO } from 'date-fns'
import { computeTotalDays, formatDateRange } from '@/lib/utils/dateUtils'
import { validateLeaveDates, validateBalance, validateSandwichRule } from '@/lib/leave/leaveValidator'
import { getLeaveBalance } from '@/lib/leave/balanceService'
import { createNotifications, notifyLeaveApplied } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'
import { sendMail } from '@/lib/email/acsMailer'
import { buildLeaveAppliedEmail } from '@/lib/email/templates/leaveApplied'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const body = await req.json()

    const {
      startDate,
      endDate,
      startDateType = 'full',
      endDateType = 'full',
      dayOverrides = [],
      totalDays,
      reason,
      isEmergency = false,
      managerId,
    } = body
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Leave Request'

    const normalizedStartHalfDay: any = startDateType === 'half' ? 'HALF_DAY' : 'NONE'
    const normalizedEndHalfDay: any = endDateType === 'half' ? 'HALF_DAY' : 'NONE'

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Get existing leaves for overlap check
    const existingLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: token.userId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { startDate: true, endDate: true, status: true },
    })

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Validate dates
    const dateValidation = validateLeaveDates(startDate, endDate, existingLeaves.map((l) => ({
      startDate: l.startDate,
      endDate: l.endDate,
      status: l.status,
    })))

    if (!dateValidation.valid) {
      return NextResponse.json({ error: dateValidation.errors.join('; '), code: 'VALIDATION_ERROR' }, { status: 422 })
    }

    const holidaysForSandwich = await prisma.publicHoliday.findMany({ select: { date: true } })
    const sandwichCheck = validateSandwichRule(
      start,
      end,
      holidaysForSandwich.map((h) => ({ date: format(h.date, 'yyyy-MM-dd') }))
    )
    if (!sandwichCheck.valid) {
      return NextResponse.json(
        { error: sandwichCheck.error, code: 'SANDWICH_RULE' },
        { status: 422 }
      )
    }

    // Use totalDays from request
    let calculatedTotalDays = typeof totalDays === 'number' ? totalDays : 0
    if (calculatedTotalDays <= 0) {
      // Fallback calculation if not provided correctly
      calculatedTotalDays = computeTotalDays(start, end, normalizedStartHalfDay, normalizedEndHalfDay)
      const startStr = format(start, 'yyyy-MM-dd')
      const endStr = format(end, 'yyyy-MM-dd')
      const interiorHalfCount = dayOverrides.filter(
        (o: any) => o.date !== startStr && o.date !== endStr && !isWeekend(parseISO(o.date))
      ).length
      calculatedTotalDays = Math.max(0.5, calculatedTotalDays - interiorHalfCount * 0.5)
    }

    // Server-side validation: totalDays cannot exceed maximum possible working days in selected range
    if (typeof totalDays === 'number' && totalDays > 0) {
      const maxWorkingDays = computeTotalDays(start, end, normalizedStartHalfDay, normalizedEndHalfDay)
      if (totalDays > maxWorkingDays) {
        return NextResponse.json({ error: 'totalDays exceeds working days in selected range', code: 'VALIDATION_ERROR' }, { status: 400 })
      }
    }

    if (calculatedTotalDays <= 0) {
      return NextResponse.json({ error: 'Selected date range has no business days', code: 'VALIDATION_ERROR' }, { status: 422 })
    }

    // Emergency leave is not additional quota; it is a flagged leave
    // that must still come from standard balance and can be max 2 consecutive days.
    const balance = await getLeaveBalance(token.userId)
    const annual = balance.balances.find(b => b.type === 'ANNUAL')!
    const effectiveAvailable = annual.total - (annual.consumed + annual.inApproval)

    if (isEmergency) {
      if (calculatedTotalDays > 2) {
        return NextResponse.json(
          { error: 'Emergency leave can be applied for a maximum of 2 consecutive days.', code: 'VALIDATION_ERROR' },
          { status: 422 }
        )
      }
      const balanceValidation = validateBalance(calculatedTotalDays, effectiveAvailable)
      if (!balanceValidation.valid) {
        return NextResponse.json({ error: balanceValidation.errors.join('; '), code: 'INSUFFICIENT_BALANCE' }, { status: 422 })
      }
    } else {
      const balanceValidation = validateBalance(calculatedTotalDays, effectiveAvailable)
      if (!balanceValidation.valid) {
        return NextResponse.json({ error: balanceValidation.errors.join('; '), code: 'INSUFFICIENT_BALANCE' }, { status: 422 })
      }
    }

    // Fetch current employee to get their managerId
    const employeeData = await prisma.employee.findUnique({
      where: { id: token.userId },
      select: { managerId: true },
    })

    const resolvedManagerId = employeeData?.managerId || managerId || null

    if (!resolvedManagerId) {
      console.warn(`[/api/leave/apply] Employee ${token.userId} has no managerId set. Leave will be created but may not appear in any manager's approvals queue.`)
    }

    // Managers' own leave requests are auto-approved
    const isManagerApplying = token.role === 'MANAGER'
    const leaveStatus = isManagerApplying ? 'APPROVED' : 'PENDING'

    // Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: token.userId,
        managerId: resolvedManagerId,
        title,
        startDate: start,
        endDate: end,
        startHalfDay: normalizedStartHalfDay,
        endHalfDay: normalizedEndHalfDay,
        dayOverrides: Array.isArray(dayOverrides) ? dayOverrides : [],
        totalDays: calculatedTotalDays,
        reason: reason.trim(),
        isEmergency,
        status: leaveStatus,
        ...(isManagerApplying && {
          approverId: token.userId,
          approvedAt: new Date(),
        }),
        emailsSent: { applied: false },
      },
    })

    // Post-creation: notifications, emails, audit — failures here must NOT return 500
    // because the leave IS already created successfully.
    try {
    // Get employee's details for notification
    const employee = await prisma.employee.findUnique({
      where: { id: token.userId },
      select: {
        displayName: true,
        workEmail: true,
        notificationEmail: true,
        jobTitle: true,
        managerId: true,
        manager: { select: { workEmail: true, notificationEmail: true, displayName: true } }
      },
    })

    const hrEmployees = await prisma.employee.findMany({
      where: { role: { in: ['HR'] }, employmentStatus: 'ACTIVE' },
      select: { id: true, workEmail: true, notificationEmail: true, role: true },
    })

    const dateLabel = formatDateRange(startDate, endDate)
    const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // 1. Internal Notifications
    if (employee?.managerId) {
      await notifyLeaveApplied(
        token.userId,
        employee.displayName,
        employee.managerId,
        hrEmployees.map((h) => h.id),
        leave.id,
        dateLabel
      )
    } else {
      const allManagers = await prisma.employee.findMany({
        where: { role: 'MANAGER', employmentStatus: 'ACTIVE' },
        select: { id: true },
      })
      const recipientIds = Array.from(
        new Set([...allManagers.map((m) => m.id), ...hrEmployees.map((h) => h.id)])
      )
      await createNotifications(
        recipientIds.map((recipientId) => ({
          type: 'LEAVE_APPLIED' as const,
          title: 'New Leave Request',
          message: `${employee?.displayName ?? 'An employee'} has submitted a leave request for ${dateLabel}`,
          recipientId,
          senderId: token.userId,
          referenceId: leave.id,
        }))
      )
    }

    const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

    // 2. Email Notifications
    const emailBase = {
      employeeName:  employee?.displayName ?? 'An employee',
      employeeEmail: employee ? getNotificationEmail(employee) : token.email,
      jobTitle:      employee?.jobTitle ?? null,
      startDate:     fmtDate(start),
      endDate:       fmtDate(end),
      totalDays,
      reason,
      isEmergency,
      leaveId:       leave.id,
      appBaseUrl,
    }

    // To Manager
    const managerAddress = employee?.manager ? getNotificationEmail(employee.manager) : null
    if (managerAddress) {
      const { subject, htmlBody } = buildLeaveAppliedEmail({
        ...emailBase,
        recipientRole: 'MANAGER',
      })
      await sendMail({ to: [managerAddress], subject, htmlBody }).catch(console.error)
    }

    // To HR/Admin
    for (const hr of hrEmployees) {
      const hrAddress = getNotificationEmail(hr)
      // Don't double-email if the manager is also HR/Admin
      if (hrAddress === managerAddress) continue

      const { subject, htmlBody } = buildLeaveAppliedEmail({
        ...emailBase,
        recipientRole: hr.role as 'HR',
      })
      await sendMail({ to: [hrAddress], subject, htmlBody }).catch(console.error)
    }

    await logAudit('LEAVE_APPLY', token.userId, token.userId, {
      before: {},
      after: { leaveId: leave.id, startDate, endDate, totalDays: calculatedTotalDays, isEmergency },
      params: { reason },
    }, req)
    } catch (postErr) {
      console.error('[/api/leave/apply] Post-creation side-effect error (leave WAS saved):', postErr)
    }

    return NextResponse.json({
      id: leave.id,
      message: 'Leave request submitted successfully',
    }, { status: 201 })
  } catch (err: unknown) {
    console.error('[/api/leave/apply] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
