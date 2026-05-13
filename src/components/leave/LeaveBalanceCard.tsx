'use client'

import { motion } from 'framer-motion'
import { useLeaveBalance } from '@/hooks/useLeaveBalance'
import { Skeleton } from '@/components/shared/LoadingSkeleton'

export function LeaveBalanceCard({ variant = 'card' }: { variant?: 'card' | 'strip' }) {
  const { data: balance, isLoading } = useLeaveBalance()

  if (isLoading) {
    if (variant === 'strip') {
      return (
        <div className="leave-balance-strip">
          <div className="balance-strip-label">Leave Balance</div>
          <div className="balance-strip-items">
            {[1, 2, 3].map((i) => (
              <div key={i} className="balance-strip-item">
                <Skeleton className="h-4 w-10 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="balance-strip-pills">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <div className="balance-strip-progress" aria-hidden="true" />
        </div>
      )
    }
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-full">
        <Skeleton className="h-3 w-28 mb-4" />
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!balance) return null

  if (variant === 'strip') {
    const usedPercent = balance.standardTotal > 0
      ? Math.min(100, (balance.standardUsed / balance.standardTotal) * 100)
      : 0
    return (
      <div className="leave-balance-strip">
        <div className="balance-strip-label">Leave Balance {balance.year}</div>
        <div className="balance-strip-items">
          <div className="balance-strip-item">
            <span className="balance-strip-number available">{balance.availableStandard.toFixed(1)}</span>
            <span className="balance-strip-sublabel">Available</span>
          </div>
          <div className="balance-strip-sep" aria-hidden="true" />
          <div className="balance-strip-item">
            <span className="balance-strip-number used">{balance.standardUsed.toFixed(1)}</span>
            <span className="balance-strip-sublabel">Used</span>
          </div>
          <div className="balance-strip-sep" aria-hidden="true" />
          <div className="balance-strip-item">
            <span className="balance-strip-number pending">{balance.pendingDays.toFixed(1)}</span>
            <span className="balance-strip-sublabel">Pending</span>
          </div>
        </div>
        <div className="balance-strip-pills">
          <span className="balance-strip-pill emergency">
            Emergency: {balance.availableEmergency}/{balance.emergencyTotal}
          </span>
          <span className="balance-strip-pill floater">
            Floater: {balance.availableFloater}/{balance.floaterTotal}
          </span>
        </div>
        <div className="balance-strip-progress" aria-hidden="true">
          <motion.div
            className="balance-strip-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${usedPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    )
  }

  // card variant — matches Screenshot 2 exactly
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col">
      {/* Header */}
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-4">
        Leave Balance
      </p>

      {/* Two sub-cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 leading-none">
            Standard
          </p>
          <p className="text-[26px] font-bold text-slate-900 leading-none">
            {balance.availableStandard.toFixed(1)}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 leading-none">
            Emergency
          </p>
          <p className="text-[26px] font-bold text-slate-900 leading-none">
            {balance.availableEmergency}
          </p>
        </div>
      </div>
    </div>
  )
}
