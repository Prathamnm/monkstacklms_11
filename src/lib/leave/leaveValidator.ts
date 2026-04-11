import { isWeekend, parseISO, isBefore, isAfter, isEqual } from 'date-fns'
import { countBusinessDays } from '@/lib/utils/dateUtils'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateLeaveDates(
  startDate: string,
  endDate: string,
  existingLeaves: Array<{ startDate: Date | string; endDate: Date | string; status: string }>
): ValidationResult {
  const errors: string[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isBefore(start, today)) {
    errors.push('Start date cannot be in the past')
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

  const businessDays = countBusinessDays(start, end)
  if (businessDays === 0) {
    errors.push('Selected date range contains no business days')
  }

  // Check for overlaps
  const hasOverlap = existingLeaves.some((leave) => {
    if (leave.status === 'CANCELLED' || leave.status === 'REJECTED' || leave.status === 'REVOKED') {
      return false
    }
    const leaveStart =
      typeof leave.startDate === 'string' ? parseISO(leave.startDate) : leave.startDate
    const leaveEnd = typeof leave.endDate === 'string' ? parseISO(leave.endDate) : leave.endDate

    return !(isAfter(start, leaveEnd) || isBefore(end, leaveStart))
  })

  if (hasOverlap) {
    errors.push('This date range overlaps with an existing leave request')
  }

  return { valid: errors.length === 0, errors }
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
      `Insufficient balance. You have ${availableBalance} days available but requested ${requestedDays} days`
    )
  }

  return { valid: errors.length === 0, errors }
}
