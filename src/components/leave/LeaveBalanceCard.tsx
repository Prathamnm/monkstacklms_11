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
          <div className="balance-strip-label">
            Leave Balance
          </div>
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
      <div
        style={{
          background: 'var(--color-card-bg)',
          border: '0.5px solid var(--color-card-border)',
          borderLeft: '3px solid var(--accent-border-green)',
          borderRadius: '0 12px 12px 0',
          padding: '16px 18px',
        }}
      >
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

  if (variant === 'strip') {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--color-card-bg)',
        border: '0.5px solid var(--color-card-border)',
        borderLeft: '3px solid var(--accent-border-green)',
        borderRadius: '0 12px 12px 0',
        padding: '16px 18px',
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest"
        style={{
          color: 'var(--icon-pill-green-stroke)',
          marginBottom: 12,
        }}
      >
        Leave balance {balance.year}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>Available</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-heading)', lineHeight: 1 }}>
            {balance.availableStandard.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>Used</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--balance-used-color)', lineHeight: 1 }}>
            {balance.standardUsed.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>Pending</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--icon-pill-blue-stroke)', lineHeight: 1 }}>
            {balance.pendingDays.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div style={{ background: 'var(--balance-track-bg)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usedPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: 'var(--accent-border-green)', height: 4, borderRadius: 2 }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          style={{
            background: 'var(--status-rejected-bg)',
            color: 'var(--pill-emergency-text)',
            fontSize: 10,
            padding: '2px 9px',
            borderRadius: 99,
            fontWeight: 500,
          }}
        >
          Emergency: {balance.availableEmergency}/{balance.emergencyTotal}
        </span>
        <span
          style={{
            background: 'var(--status-approved-bg)',
            color: 'var(--pill-floater-text)',
            fontSize: 10,
            padding: '2px 9px',
            borderRadius: 99,
            fontWeight: 500,
          }}
        >
          Floater: {balance.availableFloater}/{balance.floaterTotal}
        </span>
      </div>
    </motion.div>
  )
}
