import { cn } from '@/lib/utils/cn'
import { AvailabilityStatus } from '@/constants'

interface AvailabilityBadgeProps {
  status: AvailabilityStatus
  showLabel?: boolean
  className?: string
}

const statusConfig = {
  AVAILABLE: { 
    label: 'Available', 
    dot: 'bg-emerald-500', 
    class: 'bg-emerald-50 text-emerald-700 border-emerald-100' 
  },
  UNAVAILABLE: { 
    label: 'Unavailable', 
    dot: 'bg-red-500', 
    class: 'bg-red-50 text-red-700 border-red-100' 
  },
  HALF_DAY: { 
    label: 'Half Day', 
    dot: 'bg-amber-500', 
    class: 'bg-amber-50 text-amber-700 border-amber-100' 
  },
}

export function AvailabilityBadge({ status, showLabel = true, className }: AvailabilityBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || { 
    label: status || 'Unknown', 
    dot: 'bg-slate-400', 
    class: 'bg-slate-50 text-slate-600 border-slate-100' 
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border', 
      config.class, 
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full ring-2 ring-white', config.dot)} />
      {showLabel && config.label}
    </span>
  )
}
