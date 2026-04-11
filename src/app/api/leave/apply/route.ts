import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { parseISO } from 'date-fns'
import { computeTotalDays } from '@/lib/utils/dateUtils'
import { validateLeaveDates, validateBalance } from '@/lib/leave/leaveValidator'
import { getLeaveBalance } from '@/lib/leave/balanceService'
import { notifyLeaveApplied } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'
import { formatDateRange } from '@/lib/utils/dateUtils'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const body = await req.json()

    const { startDate, endDate, startHalfDay = 'NONE', endHalfDay = 'NONE', reason } = body

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

    // Compute total days
    const totalDays = computeTotalDays(start, end, startHalfDay, endHalfDay)

    if (totalDays <= 0) {
      return NextResponse.json({ error: 'Selected date range has no business days', code: 'VALIDATION_ERROR' }, { status: 422 })
    }

    // Validate balance
    const balance = await getLeaveBalance(token.userId)
    const balanceValidation = validateBalance(totalDays, balance.effectiveAvailable)
    if (!balanceValidation.valid) {
      return NextResponse.json({ error: balanceValidation.errors.join('; '), code: 'INSUFFICIENT_BALANCE' }, { status: 422 })
    }

    // Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: token.userId,
        startDate: start,
        endDate: end,
        startHalfDay,
        endHalfDay,
        totalDays,
        reason: reason.trim(),
        status: 'PENDING',
        emailsSent: { applied: false },
      },
    })

    // Get employee's manager for notification
    const employee = await prisma.employee.findUnique({
      where: { id: token.userId },
      select: { displayName: true, managerId: true },
    })

    const hrEmployees = await prisma.employee.findMany({
      where: { role: { in: ['HR', 'ADMIN'] }, employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    if (employee?.managerId) {
      await notifyLeaveApplied(
        token.userId,
        employee.displayName,
        employee.managerId,
        hrEmployees.map((h) => h.id),
        leave.id,
        formatDateRange(startDate, endDate)
      )
    }

    await logAudit('LEAVE_APPLY', token.userId, token.userId, {
      before: {},
      after: { leaveId: leave.id, startDate, endDate, totalDays },
      params: { reason },
    }, req)

    return NextResponse.json({
      id: leave.id,
      message: 'Leave request submitted successfully',
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    console.error('[/api/leave/apply] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
