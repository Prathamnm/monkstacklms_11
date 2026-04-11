import { prisma } from '@/lib/db/prisma'
import type { LeaveBalanceSummary } from '@/types/employee'

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
      standardAccrued: 0,
      standardUsed: 0,
      standardCarryForward: 0,
      emergencyTotal: 2,
      emergencyUsed: 0,
      availableStandard: 0,
      availableEmergency: 2,
      pendingDays,
      effectiveAvailable: 0,
    }
  }

  const availableStandard =
    balance.standardAccrued + balance.standardCarryForward - balance.standardUsed
  const availableEmergency = balance.emergencyTotal - balance.emergencyUsed

  return {
    year: balance.year,
    standardTotal: balance.standardTotal,
    standardAccrued: balance.standardAccrued,
    standardUsed: balance.standardUsed,
    standardCarryForward: balance.standardCarryForward,
    emergencyTotal: balance.emergencyTotal,
    emergencyUsed: balance.emergencyUsed,
    availableStandard,
    availableEmergency,
    pendingDays,
    effectiveAvailable: availableStandard - pendingDays,
  }
}
