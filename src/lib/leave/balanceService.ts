import { prisma } from '@/lib/db/prisma'
import { LeaveBalanceSummary } from '@/types/employee'
import { LEAVE_TYPE } from '@/constants/leaveTypes'

export async function getLeaveBalance(
  employeeId: string,
  year?: number
): Promise<LeaveBalanceSummary> {
  const targetYear = year ?? new Date().getFullYear()

  const [balance, pendingResults] = await Promise.all([
    prisma.leaveBalance.findUnique({
      where: { employeeId },
    }),
    prisma.leaveRequest.groupBy({
      by: ['isEmergency'],
      where: {
        employeeId,
        status: 'PENDING',
        startDate: { gte: new Date(`${targetYear}-01-01`) },
        endDate: { lt: new Date(`${targetYear + 1}-01-01`) },
      },
      _sum: { totalDays: true },
    })
  ])

  const getInApprovalFor = (emergency: boolean) => 
    pendingResults.find(r => r.isEmergency === emergency)?._sum.totalDays ?? 0

  // If no balance record exists, return defaults
  if (!balance) {
    return {
      year: targetYear,
      balances: [
        { type: LEAVE_TYPE.ANNUAL, total: 18, consumed: 0, inApproval: getInApprovalFor(false) },
        { type: LEAVE_TYPE.FLOATER, total: 2, consumed: 0, inApproval: 0 },
        { type: LEAVE_TYPE.EMERGENCY, total: 2, consumed: 0, inApproval: getInApprovalFor(true) },
      ]
    }
  }

  return {
    year: balance.year,
    balances: [
      { 
        type: LEAVE_TYPE.ANNUAL, 
        total: balance.standardTotal + balance.standardCarryForward, 
        consumed: balance.standardUsed, 
        inApproval: getInApprovalFor(false) 
      },
      { 
        type: LEAVE_TYPE.FLOATER, 
        total: balance.floaterTotal ?? 2, 
        consumed: balance.floaterUsed ?? 0, 
        inApproval: 0 
      },
      { 
        type: LEAVE_TYPE.EMERGENCY, 
        total: balance.emergencyTotal, 
        consumed: balance.emergencyUsed, 
        inApproval: getInApprovalFor(true) 
      },
    ]
  }
}
