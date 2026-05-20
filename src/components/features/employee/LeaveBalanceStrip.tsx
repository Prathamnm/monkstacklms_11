'use client'

import { Card } from '@/components/shared/Card'
import { cn } from '@/lib/utils/cn'
import type { LeaveType } from '@/constants'
import type { LeaveBalanceSummary, LeaveTypeBalance } from '@/types/employee'

interface LeaveBalanceStripProps {
  balance?: LeaveBalanceSummary | null
}

const EMPTY_BALANCE: LeaveTypeBalance = { type: 'ANNUAL', total: 0, consumed: 0, inApproval: 0 }

export function LeaveBalanceStrip({ balance }: LeaveBalanceStripProps) {
  const getBal = (type: LeaveType): LeaveTypeBalance =>
    balance?.balances?.find((b) => b.type === type) ?? { ...EMPTY_BALANCE, type }

  const std = getBal('ANNUAL')
  const emg = getBal('EMERGENCY')
  const flt = getBal('FLOATER')

  const stats = [
    { label: 'Available Days', value: (std.total - std.consumed - std.inApproval).toFixed(1), color: 'text-slate-900' },
    { label: 'Used Days', value: std.consumed.toFixed(1), color: 'text-slate-600' },
    { label: 'Pending Request', value: std.inApproval.toFixed(1), color: 'text-amber-600' },
    { label: 'Emergency Quota', value: `${(emg.total - emg.consumed - emg.inApproval)}/${emg.total}`, color: 'text-red-600' },
    { label: 'Floater Quota', value: `${(flt.total - flt.consumed - flt.inApproval)}/${flt.total}`, color: 'text-purple-600' },
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
