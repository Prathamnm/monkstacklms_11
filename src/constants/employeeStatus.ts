export const EMPLOYMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  TERMINATED: 'TERMINATED',
} as const

export type EmploymentStatus = (typeof EMPLOYMENT_STATUS)[keyof typeof EMPLOYMENT_STATUS]

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  HALF_DAY: 'HALF_DAY',
} as const

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS]

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
}
