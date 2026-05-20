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

  const getBal = (type: string) => 
    balance.balances.find(b => b.type === type) || { total: 0, consumed: 0, inApproval: 0 }

  const std = getBal('ANNUAL')
  const emg = getBal('EMERGENCY')
  const flt = getBal('FLOATER')

  const availStd = std.total - (std.consumed + std.inApproval)
  const availEmg = emg.total - (emg.consumed + emg.inApproval)
  const availFlt = flt.total - (flt.consumed + flt.inApproval)

  if (variant === 'strip') {
    const usedPercent = std.total > 0 ? Math.min(100, (std.consumed / std.total) * 100) : 0
    return (
      <div className="leave-balance-strip">
        <div className="balance-strip-label">Leave Balance {balance.year}</div>
        <div className="balance-strip-items">
          <div className="balance-strip-item">
            <span className="balance-strip-number available">{availStd.toFixed(1)}</span>
            <span className="balance-strip-sublabel">Available</span>
          </div>
          <div className="balance-strip-sep" aria-hidden="true" />
          <div className="balance-strip-item">
            <span className="balance-strip-number used">{std.consumed.toFixed(1)}</span>
            <span className="balance-strip-sublabel">Used</span>
          </div>
          <div className="balance-strip-sep" aria-hidden="true" />
          <div className="balance-strip-item">
            <span className="balance-strip-number pending">{std.inApproval.toFixed(1)}</span>
            <span className="balance-strip-sublabel">In Approval</span>
          </div>
        </div>
        <div className="balance-strip-pills">
          <span className="balance-strip-pill emergency">
            Emergency: {availEmg}/{emg.total}
          </span>
          <span className="balance-strip-pill floater">
            Floater: {availFlt}/{flt.total}
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

  // card variant
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-4">
        Leave Balance
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 leading-none">
            Standard
          </p>
          <p className="text-[26px] font-black text-slate-900 leading-none">
            {availStd.toFixed(1)}
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 leading-none">
            Emergency
          </p>
          <p className="text-[26px] font-black text-slate-900 leading-none">
            {availEmg}
          </p>
        </div>
      </div>
    </div>
  )
}
