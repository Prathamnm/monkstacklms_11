import { cn } from '@/lib/utils/cn'
import type { AvailabilityStatus } from '@/types/employee'

interface AvailabilityBadgeProps {
  status: AvailabilityStatus
  showLabel?: boolean
  className?: string
}

const statusConfig = {
  AVAILABLE: { label: 'Available', dot: 'bg-green-500', class: 'bg-green-50 text-green-700 border border-green-200' },
  ON_LEAVE: { label: 'On Leave', dot: 'bg-red-500', class: 'bg-red-50 text-red-700 border border-red-200' },
  HALF_DAY_AM: { label: 'Half Day (AM)', dot: 'bg-amber-500', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
  HALF_DAY_PM: { label: 'Half Day (PM)', dot: 'bg-amber-500', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
}

export function AvailabilityBadge({ status, showLabel = true, className }: AvailabilityBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || { 
    label: status || 'Unknown', 
    dot: 'bg-slate-400', 
    class: 'bg-slate-50 text-slate-600 border border-slate-200' 
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.class, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {showLabel && config.label}
    </span>
  )
}
