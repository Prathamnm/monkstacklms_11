'use client'

import { motion } from 'framer-motion'
import { format, parseISO, isBefore } from 'date-fns'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { LeaveRequest } from '@/types/leave'
import { cn } from '@/lib/utils/cn'

interface LeaveRequestCardProps {
  leave: LeaveRequest
  onCancel: (id: string) => void
}

const STATUS_STYLES = {
  APPROVED: 'bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]',
  PENDING: 'bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]',
  REJECTED: 'bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]',
  CANCELLED: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-text)]',
}

export function LeaveRequestCard({ leave, onCancel }: LeaveRequestCardProps) {
  const canCancel = (leave.status === 'PENDING' || leave.status === 'APPROVED') && 
                   isBefore(new Date(), parseISO(leave.startDate))

  return (
    <motion.div
      layout
      className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl p-5 transition-all hover:border-blue-500/20"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--color-heading)]">
            {leave.title || 'Leave Request'}
          </p>
          {leave.leaveType?.code === 'EMERGENCY' && (
            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Emergency
            </span>
          )}
        </div>
        <span className={cn(
          "text-[11px] font-medium px-2.5 py-1 rounded-full",
          STATUS_STYLES[leave.status as keyof typeof STATUS_STYLES]
        )}>
          {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
        </span>
      </div>

      <p className="text-xs text-[var(--color-muted)] mb-3">
        {formatDateRange(leave.startDate, leave.endDate)} · {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
      </p>

      {leave.reason && (
        <div className="text-sm text-[var(--color-heading)] p-3 bg-[var(--color-page-bg)] rounded-lg border border-[var(--color-card-border)] mb-4">
          {leave.reason}
        </div>
      )}

      {leave.approver && (
        <p className="text-[11px] text-[var(--color-muted)] mb-3">
          {leave.status === 'APPROVED' ? 'Approved' : 'Reviewed'} by {leave.approver.displayName} · {format(parseISO(leave.createdAt), 'dd MMM yyyy')}
        </p>
      )}

      {leave.rejectionReason && (
        <div className="text-xs text-red-600 p-3 bg-red-50 rounded-lg border border-red-100 mb-4">
          Rejection reason: {leave.rejectionReason}
        </div>
      )}

      {(leave.status === 'APPROVED' || canCancel) && (
        <div className="pt-4 border-t border-[var(--color-card-border)]">
          {leave.status === 'APPROVED' && (
            <p className="text-[10px] text-[var(--color-muted)] italic mb-3">
              Contact HR to reverse this leave.
            </p>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(leave.id)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Cancel this request
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
