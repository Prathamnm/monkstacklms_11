import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { countBusinessDays } from '@/lib/utils/dateUtils'
import { parseISO } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER'])

    const body = await req.json()
    const { title, startDate, endDate, startHalfDay = 'NONE', endHalfDay = 'NONE', reason, isEmergency = false } = body

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

    // Fetch public holidays in range
    const publicHolidays = await prisma.publicHoliday.findMany({
      where: { date: { gte: start, lte: end } },
    })
    const holidayDates = publicHolidays.map((h) => h.date.toDateString())

    // Calculate business days excluding holidays
    let totalDays = countBusinessDays(start, end, holidayDates)

    // Apply half-day adjustments
    if (startHalfDay !== 'NONE') totalDays -= 0.5
    if (endHalfDay !== 'NONE' && end.toDateString() !== start.toDateString()) totalDays -= 0.5
    totalDays = Math.max(0.5, totalDays)

    // Check balance
    const balance = await prisma.leaveBalance.findUnique({ where: { employeeId: token.userId } })
    if (!balance) return NextResponse.json({ error: 'No leave balance found' }, { status: 400 })

    if (isEmergency) {
      const availableEmergency = balance.emergencyTotal - balance.emergencyUsed
      if (totalDays > availableEmergency) {
        return NextResponse.json({ error: `Insufficient emergency balance. You have ${availableEmergency} days remaining.` }, { status: 400 })
      }
    } else {
      const availableStandard = balance.standardTotal + balance.standardCarryForward - balance.standardUsed
      if (totalDays > availableStandard) {
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
        startHalfDay,
        endHalfDay,
        totalDays,
        reason,
        isEmergency,
        status: 'APPROVED',
        approverId: token.userId,
        approvedAt: now,
      },
    })

    // Create ledger entry
    await prisma.leaveLedgerEntry.create({
      data: {
        employeeId: token.userId,
        type: 'USAGE',
        days: totalDays,
        reason: `Manager self-approved leave: ${title}`,
        referenceId: leave.id,
        performedBy: token.userId,
        year: now.getFullYear(),
      },
    })

    // Update balance
    if (isEmergency) {
      await prisma.leaveBalance.update({
        where: { employeeId: token.userId },
        data: { emergencyUsed: { increment: totalDays } },
      })
    } else {
      await prisma.leaveBalance.update({
        where: { employeeId: token.userId },
        data: { standardUsed: { increment: totalDays } },
      })
    }

    await logAudit('LEAVE_APPROVE', token.userId, token.userId, {
      before: {},
      after: { leaveId: leave.id, totalDays, selfApproved: true, note: 'self-approved by manager' },
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
