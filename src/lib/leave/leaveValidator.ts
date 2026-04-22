import { isWeekend, parseISO, isBefore } from 'date-fns'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  calculatedDays?: number
}

export interface LeaveValidationInput {
  startDate: string
  endDate: string
  startHalfDay?: 'NONE' | 'HALF_DAY'
  endHalfDay?: 'NONE' | 'HALF_DAY'
  existingLeaves: Array<{ startDate: Date | string; endDate: Date | string; status: string }>
  publicHolidayDates?: string[] // ISO date strings of public holidays
}

/**
 * Count business days between two dates, skipping weekends and public holidays.
 */
export function calculateLeaveDays(
  start: Date,
  end: Date,
  startHalfDay: 'NONE' | 'HALF_DAY' = 'NONE',
  endHalfDay: 'NONE' | 'HALF_DAY' = 'NONE',
  publicHolidayDates: string[] = []
): number {
  const holidaySet = new Set(publicHolidayDates.map((d) => new Date(d).toDateString()))

  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(23, 59, 59, 999)

  while (cur <= endNorm) {
    if (!isWeekend(cur) && !holidaySet.has(cur.toDateString())) {
      count += 1
    }
    cur.setDate(cur.getDate() + 1)
  }

  // Half-day adjustments
  const startDateStr = start.toDateString()
  const endDateStr = end.toDateString()

  const startIsWorkday = !isWeekend(start) && !holidaySet.has(startDateStr)
  const endIsWorkday = !isWeekend(end) && !holidaySet.has(endDateStr)
  const isSameDay = startDateStr === endDateStr

  if (startHalfDay === 'HALF_DAY' && startIsWorkday) {
    count -= 0.5
  }
  if (!isSameDay && endHalfDay === 'HALF_DAY' && endIsWorkday) {
    count -= 0.5
  }

  return Math.max(0.5, count)
}

export function validateLeaveDates(
  startDate: string,
  endDate: string,
  existingLeaves: Array<{ startDate: Date | string; endDate: Date | string; status: string }>,
  publicHolidayDates: string[] = [],
  startHalfDay: 'NONE' | 'HALF_DAY' = 'NONE',
  endHalfDay: 'NONE' | 'HALF_DAY' = 'NONE'
): ValidationResult {
  const errors: string[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isBefore(start, today)) {
    errors.push('Leave cannot start in the past')
  }

  if (isBefore(end, start)) {
    errors.push('End date must be after or equal to start date')
  }

  if (isWeekend(start)) {
    errors.push('Start date cannot be a weekend')
  }

  if (isWeekend(end)) {
    errors.push('End date cannot be a weekend')
  }

  // Check overlap (only PENDING + APPROVED)
  const hasOverlap = existingLeaves.some((leave) => {
    if (['CANCELLED', 'REJECTED', 'REVOKED'].includes(leave.status)) return false
    const leaveStart = typeof leave.startDate === 'string' ? parseISO(leave.startDate) : leave.startDate
    const leaveEnd = typeof leave.endDate === 'string' ? parseISO(leave.endDate) : leave.endDate
    return !(start > leaveEnd || end < leaveStart)
  })

  if (hasOverlap) {
    errors.push('You already have a leave in this period')
  }

  const calculatedDays = calculateLeaveDays(start, end, startHalfDay, endHalfDay, publicHolidayDates)

  if (calculatedDays <= 0) {
    errors.push('Selected date range contains no working days')
  }

  return { valid: errors.length === 0, errors, calculatedDays }
}

export function validateBalance(
  requestedDays: number,
  availableBalance: number
): ValidationResult {
  const errors: string[] = []

  if (requestedDays <= 0) {
    errors.push('Leave duration must be at least 0.5 days')
  }

  if (requestedDays > availableBalance) {
    errors.push(
      `Insufficient balance. You have ${availableBalance} days remaining.`
    )
  }

  return { valid: errors.length === 0, errors }
}
