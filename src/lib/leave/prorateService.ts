/**
 * Leave Policy:
 * - 18 standard leaves per calendar year (includes 2 floater days within)
 * - 2 emergency leaves per calendar year (separate pool)
 * - Employees joining on or before Jan 1 of the current year get the full allocation
 * - Mid-year joiners are prorated by remaining full months including join month
 * - Rounding: always round UP to nearest 0.5 day (employee-friendly)
 *
 * Examples for 2025:
 *   Joined Jan 1 2025 or earlier → 18 standard, 2 emergency
 *   Joined May 1 2025 → ceil((8/12)*18*2)/2 = ceil(24)/2 = 12 standard
 *   Joined Oct 1 2025 → ceil((3/12)*18*2)/2 = ceil(9)/2 = 4.5 standard
 *   Joined Dec 1 2025 → ceil((1/12)*18*2)/2 = ceil(3)/2 = 1.5 standard
 */

function roundUpToHalf(value: number): number {
  return Math.ceil(value * 2) / 2
}

/**
 * Calculate prorated standard leaves (the 18-day pool).
 * Returns full allocation if employee joined before current year.
 */
export function calculateProratedLeaves(
  joinDate: Date,
  standardLeavesPerYear: number = 18,
  targetYear?: number
): number {
  const year = targetYear ?? new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)   // Jan 1 of target year
  const yearEnd   = new Date(year, 11, 31) // Dec 31 of target year

  // Joined before this year — full allocation
  if (joinDate <= yearStart) return standardLeavesPerYear

  // Joins after this year — zero
  if (joinDate > yearEnd) return 0

  // Joined during this year — prorate by remaining months (including join month)
  const joinMonth = joinDate.getMonth() + 1  // 1 = Jan, 12 = Dec
  const remainingMonths = 13 - joinMonth      // Jan joiner gets 12, Dec joiner gets 1

  return roundUpToHalf((remainingMonths / 12) * standardLeavesPerYear)
}

/**
 * Calculate prorated floater leaves (2 days, subset of the 18 standard).
 * Prorated on the same basis as standard leaves.
 */
export function calculateProratedFloaterLeaves(
  joinDate: Date,
  floaterLeavesPerYear: number = 2,
  targetYear?: number
): number {
  const year = targetYear ?? new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year, 11, 31)

  if (joinDate <= yearStart) return floaterLeavesPerYear
  if (joinDate > yearEnd)    return 0

  const joinMonth = joinDate.getMonth() + 1
  const remainingMonths = 13 - joinMonth

  return roundUpToHalf((remainingMonths / 12) * floaterLeavesPerYear)
}

/**
 * Calculate prorated emergency leaves (2 days, separate pool from the 18).
 */
export function calculateProratedEmergencyLeaves(
  joinDate: Date,
  emergencyLeavesPerYear: number = 2,
  targetYear?: number
): number {
  const year = targetYear ?? new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year, 11, 31)

  if (joinDate <= yearStart) return emergencyLeavesPerYear
  if (joinDate > yearEnd)    return 0

  const joinMonth = joinDate.getMonth() + 1
  const remainingMonths = 13 - joinMonth

  return roundUpToHalf((remainingMonths / 12) * emergencyLeavesPerYear)
}
