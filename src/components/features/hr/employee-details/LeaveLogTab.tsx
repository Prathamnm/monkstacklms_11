'use client'

import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils/cn'

interface LeaveLogTabProps {
  balance: any
  leaves: any[]
}

export function LeaveLogTab({ balance, leaves }: LeaveLogTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <BalanceCard label="Available Standard" value={balance ? (balance.standardTotal + balance.standardCarryForward - balance.standardUsed) : undefined} highlight />
        <BalanceCard label="Floater Remaining" value={balance ? (balance.floaterTotal - balance.floaterUsed) : undefined} />
        <BalanceCard label="Emergency Remaining" value={balance ? (balance.emergencyTotal - balance.emergencyUsed) : undefined} />
        <BalanceCard label="Carry Forward" value={balance?.standardCarryForward} />
      </div>
      
      <div>
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Leave History</h3>
        {leaves.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No history recorded yet</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Days</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leaves.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{formatDateRange(l.startDate, l.endDate)}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{l.totalDays}</td>
                    <td className="px-6 py-4 text-right">
                      <LeaveStatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function BalanceCard({ label, value, highlight }: { label: string, value: number | string | undefined, highlight?: boolean }) {
  return (
    <div className={cn(
      "border p-6 rounded-2xl shadow-sm transition-all",
      highlight ? "bg-blue-600 border-blue-700 shadow-blue-100" : "bg-white border-slate-200"
    )}>
      <p className={cn("text-[10px] mb-3 uppercase font-bold tracking-widest", highlight ? "text-blue-100" : "text-slate-400")}>{label}</p>
      <p className={cn("text-3xl font-extrabold tracking-tight", highlight ? "text-white" : "text-slate-900")}>{value ?? '—'}</p>
    </div>
  )
}
