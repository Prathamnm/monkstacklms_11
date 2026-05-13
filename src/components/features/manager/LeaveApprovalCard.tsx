'use client'

import { format, parseISO } from 'date-fns'
import { Check, X, Calendar } from 'lucide-react'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { getInitials, formatDays } from '@/lib/utils/formatters'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { LeaveRequest } from '@/types/leave'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

interface LeaveApprovalCardProps {
  leave: LeaveRequest
  onApprove: () => void
  onReject: () => void
}

export function LeaveApprovalCard({ leave, onApprove, onReject }: LeaveApprovalCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-sm hover:border-blue-200 transition-all group">
      <div className="flex items-center gap-5 min-w-0">
        <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-lg font-bold shrink-0 transition-transform group-hover:scale-105">
          {getInitials(leave.employee?.displayName ?? 'U')}
        </div>
        
        <div className="min-w-0">
          <h4 className="text-xl font-bold text-slate-900 truncate leading-tight group-hover:text-blue-700 transition-colors">
            {leave.employee?.displayName ?? 'Employee'}
          </h4>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
              <Calendar size={14} className="text-blue-500" />
              {formatDateRange(leave.startDate, leave.endDate)}
              {leave.startHalfDay === 'HALF_DAY' && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ml-1">· Half Day</span>
              )}
            </div>
            <p className={HEADING_STYLES.cardSubtitle + " flex items-center gap-2"}>
              {formatDays(leave.totalDays)} · {leave.title || 'Leave Request'}
              {leave.isEmergency && (
                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg font-black tracking-tighter">Emergency</span>
              )}
            </p>
          </div>
          
          {Array.isArray(leave.dayOverrides) && leave.dayOverrides.length > 0 && (
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {leave.dayOverrides.filter((o) => o.type === 'half').map((o, idx) => (
                <span key={idx} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 uppercase tracking-tighter">
                  Half: {format(parseISO(o.date), 'dd MMM')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 max-lg:pt-4 max-lg:border-t max-lg:border-slate-100">
        <div className="mr-2">
          <LeaveStatusBadge status={leave.status} />
        </div>

        {leave.status === 'PENDING' && (
          <div className="flex items-center gap-3">
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <X size={14} />
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <Check size={14} />
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
