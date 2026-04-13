import { eachDayOfInterval, isWeekend, format, parseISO, differenceInCalendarDays, isAfter, isBefore, isEqual } from 'date-fns'

export function countBusinessDays(startDate: Date, endDate: Date, publicHolidayDateStrings: string[] = []): number {
  if (isAfter(startDate, endDate)) return 0
  const holidaySet = new Set(publicHolidayDateStrings.map((d) => new Date(d).toDateString()))
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  return days.filter((day) => !isWeekend(day) && !holidaySet.has(day.toDateString())).length
}

export function computeTotalDays(
  startDate: Date,
  endDate: Date,
  startHalfDay: string,
  endHalfDay: string
): number {
  let businessDays = countBusinessDays(startDate, endDate)

  if (startHalfDay !== 'NONE') businessDays -= 0.5

  if (endHalfDay !== 'NONE' && !isEqual(startDate, endDate)) {
    businessDays -= 0.5
  }

  return Math.max(0, businessDays)
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

export function isDateInPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return isBefore(date, today)
}

export function isDateToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export function getAvailabilityForDate(
  leaveRequests: Array<{
    startDate: Date | string
    endDate: Date | string
    startHalfDay: string
    endHalfDay: string
    status: string
  }>,
  date: Date
): 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM' {
  const approvedLeave = leaveRequests.find((lr) => {
    if (lr.status !== 'APPROVED') return false
    const start = typeof lr.startDate === 'string' ? parseISO(lr.startDate) : lr.startDate
    const end = typeof lr.endDate === 'string' ? parseISO(lr.endDate) : lr.endDate
    return (
      (isEqual(date, start) || isAfter(date, start)) &&
      (isEqual(date, end) || isBefore(date, end))
    )
  })

  if (!approvedLeave) return 'AVAILABLE'

  const start = typeof approvedLeave.startDate === 'string'
    ? parseISO(approvedLeave.startDate)
    : approvedLeave.startDate
  const end = typeof approvedLeave.endDate === 'string'
    ? parseISO(approvedLeave.endDate)
    : approvedLeave.endDate

  if (isEqual(date, start) && approvedLeave.startHalfDay === 'FIRST_HALF') return 'HALF_DAY_AM'
  if (isEqual(date, start) && approvedLeave.startHalfDay === 'SECOND_HALF') return 'HALF_DAY_PM'
  if (isEqual(date, end) && approvedLeave.endHalfDay === 'FIRST_HALF') return 'HALF_DAY_AM'
  if (isEqual(date, end) && approvedLeave.endHalfDay === 'SECOND_HALF') return 'HALF_DAY_PM'

  return 'ON_LEAVE'
}

export function timeAgo(dateStr: string): string {
  const date = parseISO(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return format(date, 'MMM d, yyyy')
}

export { format, parseISO, differenceInCalendarDays, isAfter, isBefore, isEqual }
