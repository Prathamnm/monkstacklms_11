'use client'

import { Info, AlertTriangle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { FormField, Divider } from '@/components/shared/DesignSystem'

import type { DayOverride } from '@/types/leave'

interface LeaveRequestDetailsProps {
  dayOverrides: DayOverride[]
  totalDays: number
  reason: string
  setReason: (v: string) => void
  leaveTypeId: string
  setLeaveTypeId: (v: string) => void
  leaveTypes: Array<{ id: string; code: string; name: string }>
  errors: string[]
  isSubmitDisabled: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

export function LeaveRequestDetails({
  dayOverrides,
  totalDays,
  reason,
  setReason,
  leaveTypeId,
  setLeaveTypeId,
  leaveTypes,
  errors,
  isSubmitDisabled,
  isSubmitting,
  onSubmit
}: LeaveRequestDetailsProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden h-fit sticky top-8 shadow-sm">
      <div className="p-5 space-y-4">

        {dayOverrides.length > 0 && (
          <>
            <Divider />
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Total Selected
              </div>
              <div className="text-[12px] font-black text-slate-900 uppercase tracking-widest">
                {totalDays} day{totalDays !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <Info size={40} className="text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                  <Activity size={12} />
                  Pro Tip
                </div>
                <p className="text-white text-[13px] font-bold leading-relaxed">
                  Right-click any selected date on the calendar to toggle it as a <span className="text-slate-300">Half Day</span>.
                </p>
              </div>
            </div>
          </>
        )}

        <Divider />
        <FormField label="Leave Type" required>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-slate-500/5 focus:border-slate-500 outline-none transition-all"
          >
            <option value="">Select leave type</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </FormField>

        <Divider />
        <FormField label="Reason" required>
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for your leave request"
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 min-h-[120px] focus:ring-4 focus:ring-slate-500/5 focus:border-slate-500 outline-none transition-all resize-none"
            />
            <div className="flex justify-end">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-md">
                {reason.length} / 500
              </p>
            </div>
          </div>
        </FormField>

        {errors.length > 0 && (
          <div className="space-y-2 pt-2">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-red-600 text-[11px] font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertTriangle size={14} className="shrink-0" />
                {err}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className={cn(
            "w-full py-4 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 mt-4",
            isSubmitDisabled
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            'Apply for Leave'
          )}
        </button>
      </div>
    </div>
  )
}
