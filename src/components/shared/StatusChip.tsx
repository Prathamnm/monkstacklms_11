import { cn } from '@/lib/utils/cn'
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_STYLES } from '@/constants/leaveStatus'
import { LeaveStatus } from '@/constants'

interface StatusChipProps {
  status: LeaveStatus
  className?: string
}

export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        LEAVE_STATUS_STYLES[status as LeaveStatus],
        className
      )}
    >
      {LEAVE_STATUS_LABELS[status as LeaveStatus]}
    </span>
  )
}
