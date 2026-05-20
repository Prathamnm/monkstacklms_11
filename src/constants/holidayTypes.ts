export const HOLIDAY_TYPE = {
  PUBLIC: 'PUBLIC',
  FLOATER: 'FLOATER',
} as const

export type HolidayType = (typeof HOLIDAY_TYPE)[keyof typeof HOLIDAY_TYPE]

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  PUBLIC: 'Public Holiday',
  FLOATER: 'Floater Holiday',
}
