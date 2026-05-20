export const LEAVE_TYPE = {
  ANNUAL: 'ANNUAL',
  SICK: 'SICK',
  FLOATER: 'FLOATER',
  EMERGENCY: 'EMERGENCY',
} as const

export type LeaveType = (typeof LEAVE_TYPE)[keyof typeof LEAVE_TYPE]

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  FLOATER: 'Floater Leave',
  EMERGENCY: 'Emergency Leave',
}

export type HalfDayType = 'NONE' | 'HALF_DAY'
