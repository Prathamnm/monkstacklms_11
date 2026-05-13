'use client'

import { Card } from '@/components/shared/Card'
import { cn } from '@/lib/utils/cn'

interface LeaveBalanceStripProps {
  balance: {
    availableStandard: number | string
    standardUsed: number | string
    pendingDays: number | string
    availableEmergency: number | string
    availableFloater: number | string
  } | null
}

export function LeaveBalanceStrip({ balance }: LeaveBalanceStripProps) {
  const stats = [
    { label: 'Available Days', value: balance?.availableStandard ?? '—', color: 'text-blue-600' },
    { label: 'Used Days', value: balance?.standardUsed ?? '—', color: 'text-slate-600' },
    { label: 'Pending Request', value: balance?.pendingDays ?? '—', color: 'text-amber-600' },
    { label: 'Emergency Quota', value: `${balance?.availableEmergency ?? 0}/2`, color: 'text-red-600' },
    { label: 'Floater Quota', value: `${balance?.availableFloater ?? 0}/2`, color: 'text-purple-600' },
  ]

  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-100">
        {stats.map((s, idx) => (
          <div key={s.label} className={cn(
            "p-5 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group",
            idx >= 2 && "max-md:border-t max-md:border-slate-100 max-md:divide-none"
          )}>
            <p className="text-[11px] font-bold text-slate-950 uppercase tracking-widest mb-1 transition-colors">
              {s.label}
            </p>
            <p className={cn("text-2xl font-bold tracking-tight", s.color)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
