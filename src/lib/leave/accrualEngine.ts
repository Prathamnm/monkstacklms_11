import { prisma } from '@/lib/db/prisma'
import { postAccrual, postCarryForward, postEmergencyGrant } from './ledgerService'

export async function runMonthlyAccrual(): Promise<{
  processed: number
  errors: string[]
}> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const rule = await prisma.accrualRule.findFirst({ where: { isActive: true } })
  if (!rule) throw new Error('No active accrual rule found')

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: 'ACTIVE' },
    select: { id: true, displayName: true },
  })

  const errors: string[] = []
  let processed = 0

  for (const employee of employees) {
    try {
      await postAccrual({
        employeeId: employee.id,
        days: rule.daysPerMonth,
        reason: `Monthly accrual - ${now.toLocaleString('default', { month: 'long' })} ${year}`,
        year,
        month,
      })
      processed++
    } catch (err) {
      errors.push(`Failed to accrue for ${employee.displayName}: ${err}`)
    }
  }

  return { processed, errors }
}

export async function runYearEndProcessing(
  previousYear: number
): Promise<{ processed: number; errors: string[] }> {
  const rule = await prisma.accrualRule.findFirst({ where: { isActive: true } })
  if (!rule) throw new Error('No active accrual rule found')

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: 'ACTIVE' },
    include: { leaveBalance: true },
  })

  const errors: string[] = []
  let processed = 0
  const newYear = previousYear + 1

  for (const employee of employees) {
    try {
      const balance = employee.leaveBalance
      const used = balance?.standardUsed ?? 0
      const accrued = balance?.standardAccrued ?? 0
      const carryForward = balance?.standardCarryForward ?? 0
      const unused = accrued + carryForward - used

      const newCarryForward = rule.carryForwardEnabled
        ? Math.min(Math.max(0, unused), rule.carryForwardMaxDays)
        : 0

      // Create new balance for new year
      await prisma.leaveBalance.upsert({
        where: { employeeId: employee.id },
        create: {
          employeeId: employee.id,
          year: newYear,
          standardTotal: rule.standardLeavesPerYear,
          standardAccrued: 0,
          standardUsed: 0,
          standardCarryForward: newCarryForward,
          emergencyTotal: rule.emergencyLeavesPerYear,
          emergencyUsed: 0,
        },
        update: {
          year: newYear,
          standardTotal: rule.standardLeavesPerYear,
          standardAccrued: 0,
          standardUsed: 0,
          standardCarryForward: newCarryForward,
          emergencyTotal: rule.emergencyLeavesPerYear,
          emergencyUsed: 0,
        },
      })

      if (newCarryForward > 0) {
        await postCarryForward({
          employeeId: employee.id,
          days: newCarryForward,
          reason: `Year-end carry-forward from ${previousYear}`,
          year: newYear,
        })
      }

      await postEmergencyGrant({
        employeeId: employee.id,
        days: rule.emergencyLeavesPerYear,
        reason: `Annual emergency leave grant for ${newYear}`,
        year: newYear,
      })

      processed++
    } catch (err) {
      errors.push(`Failed to process year-end for ${employee.displayName}: ${err}`)
    }
  }

  return { processed, errors }
}
