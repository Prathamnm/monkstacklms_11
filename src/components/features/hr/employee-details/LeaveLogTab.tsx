'use client'

import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils/cn'

interface LeaveLogTabProps {
  balance: any
  leaves: any[]
}

export function LeaveLogTab({ balance, leaves }: LeaveLogTabProps) {
  const getBal = (type: string) => 
    balance?.balances?.find((b: any) => b.type === type) || { total: 0, consumed: 0, inApproval: 0 }

  const std = getBal('ANNUAL')
  const flt = getBal('FLOATER')
  const emg = getBal('EMERGENCY')

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <BalanceCard label="Available Standard" value={balance ? (std.total - std.consumed - std.inApproval) : undefined} highlight />
        <BalanceCard label="Floater Remaining" value={balance ? (flt.total - flt.consumed - flt.inApproval) : undefined} />
        <BalanceCard label="Emergency Remaining" value={balance ? (emg.total - emg.consumed - emg.inApproval) : undefined} />
        <BalanceCard label="In Approval" value={std.inApproval + flt.inApproval + emg.inApproval} />
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
      highlight ? "bg-slate-800 border-slate-900 shadow-slate-200" : "bg-white border-slate-200"
    )}>
      <p className={cn("text-[10px] mb-3 uppercase font-bold tracking-widest", highlight ? "text-slate-300" : "text-slate-400")}>{label}</p>
      <p className={cn("text-3xl font-extrabold tracking-tight", highlight ? "text-white" : "text-slate-900")}>{value ?? '—'}</p>
    </div>
  )
}
