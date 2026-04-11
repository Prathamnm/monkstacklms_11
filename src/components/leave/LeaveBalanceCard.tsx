'use client'

import { motion } from 'framer-motion'
import { useLeaveBalance } from '@/hooks/useLeaveBalance'
import { Skeleton } from '@/components/shared/LoadingSkeleton'

export function LeaveBalanceCard() {
  const { data: balance, isLoading } = useLeaveBalance()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!balance) return null

  const usedPercent = balance.standardTotal > 0
    ? Math.min(100, (balance.standardUsed / balance.standardTotal) * 100)
    : 0

  const pendingPercent = balance.standardTotal > 0
    ? Math.min(100 - usedPercent, (balance.pendingDays / balance.standardTotal) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl border border-slate-200 p-6"
    >
      <h3 className="text-slate-900 font-semibold text-base mb-4">
        Leave Balance {balance.year}
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-3xl font-bold text-slate-900">{balance.availableStandard.toFixed(1)}</p>
          <p className="text-slate-500 text-xs mt-1">Available</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-amber-600">{balance.standardUsed.toFixed(1)}</p>
          <p className="text-slate-500 text-xs mt-1">Used</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-blue-600">{balance.pendingDays.toFixed(1)}</p>
          <p className="text-slate-500 text-xs mt-1">Pending</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Standard Leave</span>
          <span>{balance.standardUsed}/{balance.standardTotal} days used</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usedPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="bg-amber-500 rounded-l-full"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pendingPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="bg-blue-300"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Emergency: {balance.emergencyTotal - balance.emergencyUsed}/{balance.emergencyTotal}
        </span>
        {balance.standardCarryForward > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Carry-forward: +{balance.standardCarryForward}
          </span>
        )}
      </div>
    </motion.div>
  )
}
