import { prisma } from '@/lib/db/prisma'

interface LedgerEntryParams {
  employeeId: string
  days: number
  reason: string
  referenceId?: string
  performedBy?: string
  year?: number
  month?: number
}

export async function postUsage(params: LedgerEntryParams) {
  const year = params.year ?? new Date().getFullYear()
  const month = params.month ?? new Date().getMonth() + 1

  await prisma.$transaction([
    prisma.leaveLedgerEntry.create({
      data: {
        employeeId: params.employeeId,
        type: 'USAGE',
        days: -Math.abs(params.days),
        reason: params.reason,
        referenceId: params.referenceId,
        performedBy: params.performedBy,
        year,
        month,
      },
    }),
    prisma.leaveBalance.update({
      where: { employeeId: params.employeeId },
      data: { standardUsed: { increment: Math.abs(params.days) } },
    }),
  ])
}

export async function postReversal(params: LedgerEntryParams) {
  const year = params.year ?? new Date().getFullYear()

  await prisma.$transaction([
    prisma.leaveLedgerEntry.create({
      data: {
        employeeId: params.employeeId,
        type: 'REVERSAL',
        days: Math.abs(params.days),
        reason: params.reason,
        referenceId: params.referenceId,
        performedBy: params.performedBy,
        year,
      },
    }),
    prisma.leaveBalance.update({
      where: { employeeId: params.employeeId },
      data: { standardUsed: { decrement: Math.abs(params.days) } },
    }),
  ])
}

export async function postAccrual(params: LedgerEntryParams) {
  const year = params.year ?? new Date().getFullYear()
  const month = params.month ?? new Date().getMonth() + 1

  await prisma.$transaction([
    prisma.leaveLedgerEntry.create({
      data: {
        employeeId: params.employeeId,
        type: 'ACCRUAL',
        days: Math.abs(params.days),
        reason: params.reason,
        year,
        month,
      },
    }),
    prisma.leaveBalance.update({
      where: { employeeId: params.employeeId },
      data: { standardAccrued: { increment: Math.abs(params.days) } },
    }),
  ])
}

export async function postAdjustment(params: LedgerEntryParams) {
  const year = params.year ?? new Date().getFullYear()

  const updateData =
    params.days > 0
      ? { standardAccrued: { increment: Math.abs(params.days) } }
      : { standardUsed: { increment: Math.abs(params.days) } }

  await prisma.$transaction([
    prisma.leaveLedgerEntry.create({
      data: {
        employeeId: params.employeeId,
        type: 'ADJUSTMENT',
        days: params.days,
        reason: params.reason,
        performedBy: params.performedBy,
        year,
      },
    }),
    prisma.leaveBalance.update({
      where: { employeeId: params.employeeId },
      data: updateData,
    }),
  ])
}

export async function postCarryForward(params: LedgerEntryParams) {
  const year = params.year ?? new Date().getFullYear()

  await prisma.$transaction([
    prisma.leaveLedgerEntry.create({
      data: {
        employeeId: params.employeeId,
        type: 'CARRY_FORWARD',
        days: Math.abs(params.days),
        reason: params.reason,
        year,
      },
    }),
    prisma.leaveBalance.update({
      where: { employeeId: params.employeeId },
      data: { standardCarryForward: { increment: Math.abs(params.days) } },
    }),
  ])
}

export async function postEmergencyGrant(params: LedgerEntryParams) {
  const year = params.year ?? new Date().getFullYear()

  await prisma.leaveLedgerEntry.create({
    data: {
      employeeId: params.employeeId,
      type: 'EMERGENCY_GRANT',
      days: Math.abs(params.days),
      reason: params.reason,
      year,
    },
  })
}
