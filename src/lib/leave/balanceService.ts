import { prisma } from '@/lib/db/prisma'

export interface LeaveBalanceSummary {
  year: number
  standardTotal: number
  standardUsed: number
  standardCarryForward: number
  availableStandard: number
  floaterTotal: number
  floaterUsed: number
  availableFloater: number
  emergencyTotal: number
  emergencyUsed: number
  availableEmergency: number
  pendingDays: number
  effectiveAvailable: number
}

export async function getLeaveBalance(
  employeeId: string,
  year?: number
): Promise<LeaveBalanceSummary> {
  const targetYear = year ?? new Date().getFullYear()

  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId },
  })

  const pendingLeaves = await prisma.leaveRequest.aggregate({
    where: {
      employeeId,
      status: 'PENDING',
      startDate: { gte: new Date(`${targetYear}-01-01`) },
      endDate: { lt: new Date(`${targetYear + 1}-01-01`) },
    },
    _sum: { totalDays: true },
  })

  const pendingDays = pendingLeaves._sum.totalDays ?? 0

  if (!balance) {
    return {
      year: targetYear,
      standardTotal: 18,
      standardUsed: 0,
      standardCarryForward: 0,
      availableStandard: 18,
      floaterTotal: 2,
      floaterUsed: 0,
      availableFloater: 2,
      emergencyTotal: 2,
      emergencyUsed: 0,
      availableEmergency: 2,
      pendingDays,
      effectiveAvailable: 18,
    }
  }

  const availableStandard = balance.standardTotal + balance.standardCarryForward - balance.standardUsed
  const availableFloater  = (balance.floaterTotal ?? 2) - (balance.floaterUsed ?? 0)
  const availableEmergency = balance.emergencyTotal - balance.emergencyUsed

  return {
    year: balance.year,
    standardTotal: balance.standardTotal,
    standardUsed: balance.standardUsed,
    standardCarryForward: balance.standardCarryForward,
    availableStandard,
    floaterTotal:    balance.floaterTotal  ?? 2,
    floaterUsed:     balance.floaterUsed   ?? 0,
    availableFloater,
    emergencyTotal: balance.emergencyTotal,
    emergencyUsed: balance.emergencyUsed,
    availableEmergency,
    pendingDays,
    effectiveAvailable: availableStandard - pendingDays,
  }
}
