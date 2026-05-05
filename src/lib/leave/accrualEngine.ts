import { prisma } from '@/lib/db/prisma'
import { postAccrual, postCarryForward, postEmergencyGrant } from './ledgerService'

/**
 * YEARLY FLAT GRANT — runs every Jan 1.
 * For each active employee:
 *   1. Calculate carry-forward from previous year (max from SystemSettings or 10)
 *   2. Reset balance: standardTotal = 18 (from settings), standardUsed = 0
 *   3. Set standardCarryForward = calculated carry-forward
 *   4. Reset emergency: emergencyTotal = 2, emergencyUsed = 0
 *   5. Create ledger entries for all changes
 *   6. Update SystemSettings.LAST_ACCRUAL_RUN = now
 */
export async function runYearlyFlatGrant(): Promise<{ processed: number; errors: string[] }> {
  const now = new Date()
  const newYear = now.getFullYear()
  const previousYear = newYear - 1

  // Load settings
  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: ['STANDARD_LEAVES_PER_YEAR', 'CARRY_FORWARD_MAX_DAYS', 'CARRY_FORWARD_ENABLED'] } },
  })

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const standardLeavesPerYear = parseFloat(settingsMap['STANDARD_LEAVES_PER_YEAR'] ?? '18')
  const carryForwardMaxDays = parseFloat(settingsMap['CARRY_FORWARD_MAX_DAYS'] ?? '10')
  const carryForwardEnabled = (settingsMap['CARRY_FORWARD_ENABLED'] ?? 'true') === 'true'

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: 'ACTIVE' },
    include: { leaveBalance: true },
  })

  const errors: string[] = []
  let processed = 0

  for (const employee of employees) {
    try {
      const balance = employee.leaveBalance
      const previousUsed = balance?.standardUsed ?? 0
      const previousTotal = balance?.standardTotal ?? standardLeavesPerYear
      const previousCarryForward = balance?.standardCarryForward ?? 0
      const previousUnused = previousTotal + previousCarryForward - previousUsed

      const newCarryForward = carryForwardEnabled
        ? Math.min(Math.max(0, previousUnused), carryForwardMaxDays)
        : 0

      // Upsert balance for new year
      await prisma.leaveBalance.upsert({
        where: { employeeId: employee.id },
        create: {
          employeeId: employee.id,
          year: newYear,
          standardTotal: standardLeavesPerYear,
          standardAccrued: standardLeavesPerYear,
          standardUsed: 0,
          standardCarryForward: newCarryForward,
          emergencyTotal: 2,
          emergencyUsed: 0,
        },
        update: {
          year: newYear,
          standardTotal: standardLeavesPerYear,
          standardAccrued: standardLeavesPerYear,
          standardUsed: 0,
          standardCarryForward: newCarryForward,
          emergencyTotal: 2,
          emergencyUsed: 0,
        },
      })

      // Ledger: flat standard grant
      await postAccrual({
        employeeId: employee.id,
        days: standardLeavesPerYear,
        reason: `Year-start flat grant for ${newYear}`,
        year: newYear,
        month: 1,
      })

      // Ledger: carry-forward
      if (newCarryForward > 0) {
        await postCarryForward({
          employeeId: employee.id,
          days: newCarryForward,
          reason: `Carry-forward from ${previousYear} (max ${carryForwardMaxDays} days)`,
          year: newYear,
        })
      }

      // Ledger: emergency reset
      await postEmergencyGrant({
        employeeId: employee.id,
        days: 2,
        reason: `Annual emergency leave reset for ${newYear}`,
        year: newYear,
      })

      processed++
    } catch (err) {
      errors.push(`Failed to process ${employee.displayName}: ${err}`)
    }
  }

  // Update last accrual run timestamp
  await prisma.systemSettings.upsert({
    where: { key: 'LAST_ACCRUAL_RUN' },
    create: { key: 'LAST_ACCRUAL_RUN', value: now.toISOString(), description: 'Timestamp of last accrual run' },
    update: { value: now.toISOString() },
  })

  return { processed, errors }
}

/**
 * PRO-RATED GRANT ON ONBOARDING — called when a new employee joins mid-year.
 * Standard leaves = round((monthsRemaining / 12) * 18) to nearest 0.5
 * Emergency leaves = always 2 (full)
 */
export async function grantProRatedLeaves(
  employeeId: string,
  joinDate: Date,
  performedBy: string
): Promise<void> {
  const year = joinDate.getFullYear()
  const joinMonth = joinDate.getMonth() + 1 // 1-12
  const monthsRemaining = 13 - joinMonth // months left in year including join month

  // Round to nearest 0.5
  const standardLeaves = Math.round(((monthsRemaining / 12) * 18) * 2) / 2
  const emergencyLeaves = 2

  await prisma.leaveBalance.upsert({
    where: { employeeId },
    create: {
      employeeId,
      year,
      standardTotal: standardLeaves,
      standardAccrued: standardLeaves,
      standardUsed: 0,
      standardCarryForward: 0,
      emergencyTotal: emergencyLeaves,
      emergencyUsed: 0,
    },
    update: {
      year,
      standardTotal: standardLeaves,
      standardAccrued: standardLeaves,
      standardUsed: 0,
      standardCarryForward: 0,
      emergencyTotal: emergencyLeaves,
      emergencyUsed: 0,
    },
  })

  await postAccrual({
    employeeId,
    days: standardLeaves,
    reason: `Pro-rated grant on onboarding (${monthsRemaining} months remaining in ${year})`,
    year,
    month: joinMonth,
  })

  await postEmergencyGrant({
    employeeId,
    days: emergencyLeaves,
    reason: 'Emergency leave grant on onboarding',
    year,
  })
}

// Legacy — kept to not break existing /api/accrual/run route
export { runYearlyFlatGrant as runMonthlyAccrual }
