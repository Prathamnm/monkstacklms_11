'use client'

import { format, isEqual } from 'date-fns'
import { Info, AlertTriangle } from 'lucide-react'
import { HalfDaySelector } from '@/components/leave/HalfDaySelector'
import { cn } from '@/lib/utils/cn'
import { DateRange } from 'react-day-picker'
import { HalfDayType } from '@/types/leave'
import { SectionHeader, FormField, Divider } from '@/components/shared/DesignSystem'

interface LeaveRequestDetailsProps {
  title: string
  setTitle: (v: string) => void
  range: DateRange | undefined
  totalDays: number
  startHalfDay: HalfDayType
  setStartHalfDay: (v: HalfDayType) => void
  endHalfDay: HalfDayType
  setEndHalfDay: (v: HalfDayType) => void
  reason: string
  setReason: (v: string) => void
  isEmergency: boolean
  setIsEmergency: (v: boolean) => void
  errors: string[]
  isSubmitDisabled: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

export function LeaveRequestDetails({
  title,
  setTitle,
  range,
  totalDays,
  startHalfDay,
  setStartHalfDay,
  endHalfDay,
  setEndHalfDay,
  reason,
  setReason,
  isEmergency,
  setIsEmergency,
  errors,
  isSubmitDisabled,
  isSubmitting,
  onSubmit
}: LeaveRequestDetailsProps) {
  const isSingleDay = !range?.to || (range.from && range.to && isEqual(range.from, range.to))

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden h-fit sticky top-8">
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <SectionHeader title="Request Details" className="mb-0" />
      </div>

      <div className="p-6 space-y-6">
        <FormField label="Leave Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual Leave, Medical"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
          />
        </FormField>

        {range?.from && (
          <>
            <Divider />
            <RequestSummary 
              from={range.from} 
              to={range.to} 
              totalDays={totalDays} 
            />
            
            <Divider />
            <FormField label="Day Options">
              <div className="p-4 bg-white rounded-xl border border-slate-100">
                <HalfDaySelector
                  startHalfDay={startHalfDay}
                  endHalfDay={endHalfDay}
                  onStartHalfDayChange={setStartHalfDay}
                  onEndHalfDayChange={setEndHalfDay}
                  isSingleDay={!!isSingleDay}
                />
              </div>
            </FormField>
          </>
        )}

        <Divider />
        <FormField label="Reason" required>
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for your leave request"
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 min-h-[120px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all resize-none"
            />
            <div className="flex justify-end">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-md">
                {reason.length} / 500
              </p>
            </div>
          </div>
        </FormField>

        <EmergencyToggle 
          checked={isEmergency} 
          onChange={setIsEmergency} 
        />

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
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
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

function RequestSummary({ from, to, totalDays }: { from: Date, to: Date | undefined, totalDays: number }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-3 text-blue-900 text-sm font-semibold mb-1">
        <Info size={16} className="text-blue-600" />
        {to && !isEqual(from, to)
          ? `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
          : format(from, 'MMMM d, yyyy')}
      </div>
      <p className="text-xs text-blue-700 font-medium ml-7">
        Total Duration: <span className="font-bold">{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
      </p>
    </div>
  )
}

function EmergencyToggle({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <label className={cn(
      "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border",
      checked 
        ? "bg-red-50 border-red-100 shadow-sm shadow-red-50" 
        : "bg-slate-50/50 border-transparent hover:border-slate-200"
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-slate-300"
      />
      <div className={cn("p-1.5 rounded-lg transition-colors", checked ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400")}>
        <AlertTriangle size={14} />
      </div>
      <span className={cn("text-[11px] font-bold uppercase tracking-wider", checked ? "text-red-700" : "text-slate-500")}>
        Emergency Leave
      </span>
    </label>
  )
}
