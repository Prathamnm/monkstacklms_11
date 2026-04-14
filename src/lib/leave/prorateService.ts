/**
 * Calculate prorated leaves based on joining date
 * 
 * Logic:
 * - Employee gets 18 standard leaves per year
 * - Prorated based on months remaining in the year from joining date
 * - Formula: ((12 - joiningMonth + 1) / 12) * 18
 * 
 * Examples:
 * - Joined Jan 1: (12 / 12) * 18 = 18 days
 * - Joined May 1: (8 / 12) * 18 = 12 days
 * - Joined Dec 1: (1 / 12) * 18 = 1.5 days
 */

export function calculateProratedLeaves(
  joinDate: Date,
  standardLeavesPerYear: number = 18,
  targetYear?: number
): number {
  const now = new Date()
  const year = targetYear ?? now.getFullYear()
  
  // Get the start of the target year
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  
  // If employee joined before this year, they get full leaves for this year
  if (joinDate < yearStart) {
    return standardLeavesPerYear
  }
  
  // If employee joined after this year, no leaves for this year
  if (joinDate > yearEnd) {
    return 0
  }
  
  // Employee joined this year - calculate prorated leaves
  // Get the month of joining (1-12)
  const joiningMonth = joinDate.getMonth() + 1
  
  // Calculate remaining months in the year (including joining month)
  const remainingMonths = 13 - joiningMonth
  
  // Calculate prorated leaves: (remainingMonths / 12) * standardLeavesPerYear
  const proratedLeaves = (remainingMonths / 12) * standardLeavesPerYear
  
  // Round to 1 decimal place
  return Math.round(proratedLeaves * 10) / 10
}

/**
 * Get the prorated emergency leaves
 * Typically 2 leaves per year, prorated similarly
 */
export function calculateProratedEmergencyLeaves(
  joinDate: Date,
  emergencyLeavesPerYear: number = 2,
  targetYear?: number
): number {
  const now = new Date()
  const year = targetYear ?? now.getFullYear()
  
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  
  if (joinDate < yearStart) {
    return emergencyLeavesPerYear
  }
  
  if (joinDate > yearEnd) {
    return 0
  }
  
  const joiningMonth = joinDate.getMonth() + 1
  const remainingMonths = 13 - joiningMonth
  const proratedLeaves = (remainingMonths / 12) * emergencyLeavesPerYear
  
  return Math.round(proratedLeaves * 10) / 10
}
