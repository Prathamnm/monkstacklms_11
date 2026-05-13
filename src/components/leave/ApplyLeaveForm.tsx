'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { parseISO, isWeekend } from 'date-fns'
import { calculateLeaveDays } from '@/lib/leave/leaveValidator'
import { HalfDaySelector } from '@/components/leave/HalfDaySelector'
import type { PublicHoliday } from '@/types/holiday'
import { cn } from '@/lib/utils/cn'
import { AlertCircle, CheckCircle2, Info, Send } from 'lucide-react'
import { HEADING_STYLES } from '@/constants/tailwind'

interface LeaveFormData {
  title: string
  startDate: string
  endDate: string
  startHalfDay: 'NONE' | 'HALF_DAY'
  endHalfDay: 'NONE' | 'HALF_DAY'
  reason: string
  isEmergency: boolean
}

interface ApplyLeaveFormProps {
  role: 'EMPLOYEE' | 'MANAGER' | 'HR'
  onSubmit: (data: LeaveFormData) => Promise<void>
  isSubmitting: boolean
  autoApproved?: boolean // true for MANAGER
}

export function ApplyLeaveForm({ role, onSubmit, isSubmitting, autoApproved = false }: ApplyLeaveFormProps) {
  const { instance } = useMsal()
  const { data: currentUserData } = useCurrentUser()

  const [form, setForm] = useState<LeaveFormData>({
    title: '',
    startDate: '',
    endDate: '',
    startHalfDay: 'NONE',
    endHalfDay: 'NONE',
    reason: '',
    isEmergency: false,
  })

  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({})
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null)

  const { data: holidays = [] } = useQuery<PublicHoliday[]>({
    queryKey: ['publicHolidays'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: existingLeaves = [] } = useQuery({
    queryKey: ['myLeaves', 'forForm'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const publicHolidayDates = holidays.map((h) => h.date)
  const balance = currentUserData?.balance

  useEffect(() => {
    if (!form.startDate || !form.endDate) {
      setCalculatedDays(null)
      return
    }
    try {
      const start = parseISO(form.startDate)
      const end = parseISO(form.endDate)
      if (end < start) { setCalculatedDays(null); return }
      const days = calculateLeaveDays(start, end, form.startHalfDay, form.endHalfDay, publicHolidayDates)
      setCalculatedDays(days)
    } catch {
      setCalculatedDays(null)
    }
  }, [form.startDate, form.endDate, form.startHalfDay, form.endHalfDay, publicHolidayDates])

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'Title is required'
    if (!form.startDate) errors.startDate = 'Start date is required'
    if (!form.endDate) errors.endDate = 'End date is required'
    if (!form.reason.trim() || form.reason.trim().length < 10) errors.reason = 'Reason must be at least 10 characters'

    if (form.startDate) {
      const today = new Date(); today.setHours(0,0,0,0)
      const start = parseISO(form.startDate)
      if (start < today) errors.startDate = 'Leave cannot start in the past'
      if (isWeekend(start)) errors.startDate = 'Start date cannot be a weekend'
    }
    if (form.endDate && form.startDate && parseISO(form.endDate) < parseISO(form.startDate)) {
      errors.endDate = 'End date must be after start date'
    }

    if (calculatedDays !== null && balance) {
      if (form.isEmergency) {
        if (calculatedDays > balance.availableEmergency) {
          errors.balance = `Insufficient emergency balance. You have ${balance.availableEmergency} days remaining.`
        }
      } else {
        if (calculatedDays > balance.availableStandard) {
          errors.balance = `Insufficient balance. You have ${balance.availableStandard} days remaining.`
        }
      }
    }

    if (form.startDate && form.endDate) {
      const start = parseISO(form.startDate)
      const end = parseISO(form.endDate)
      const overlap = existingLeaves.some((l: { startDate: string; endDate: string; status: string }) => {
        if (['CANCELLED','REJECTED','REVOKED'].includes(l.status)) return false
        const ls = parseISO(l.startDate)
        const le = parseISO(l.endDate)
        return !(start > le || end < ls)
      })
      if (overlap) errors.overlap = 'You already have a leave in this period'
    }

    setInlineErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(form)
  }

  const availableBalance = form.isEmergency ? (balance?.availableEmergency ?? 2) : (balance?.availableStandard ?? 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {autoApproved && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3 shadow-inner">
          <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
          <p className="text-[13px] font-medium text-blue-800 leading-snug">
            As a manager, your leave request will be <strong>automatically approved</strong> by the system.
          </p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <label className={HEADING_STYLES.cardSubtitle + " ml-1"}>
          Purpose of Leave <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            maxLength={100}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Family function, Medical appointment"
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all outline-none bg-slate-50/30",
              inlineErrors.title 
                ? "border-red-200 focus:border-red-400 focus:ring-4 focus:ring-red-500/5" 
                : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5"
            )}
          />
          {inlineErrors.title && (
            <div className="flex items-center gap-1.5 mt-2 ml-1 text-red-500">
              <AlertCircle size={12} />
              <p className="text-[11px] font-bold uppercase tracking-tight">{inlineErrors.title}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className={HEADING_STYLES.cardSubtitle + " ml-1"}>
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all outline-none bg-slate-50/30",
              inlineErrors.startDate ? "border-red-200" : "border-slate-200 focus:border-blue-400"
            )}
          />
          {inlineErrors.startDate && (
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight ml-1">{inlineErrors.startDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className={HEADING_STYLES.cardSubtitle + " ml-1"}>
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            min={form.startDate || new Date().toISOString().split('T')[0]}
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all outline-none bg-slate-50/30",
              inlineErrors.endDate ? "border-red-200" : "border-slate-200 focus:border-blue-400"
            )}
          />
          {inlineErrors.endDate && (
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight ml-1">{inlineErrors.endDate}</p>
          )}
        </div>
      </div>

      {/* Half-day selectors */}
      {form.startDate && (
        <HalfDaySelector
          startHalfDay={form.startHalfDay}
          endHalfDay={form.endHalfDay}
          onStartHalfDayChange={(v) => setForm({ ...form, startHalfDay: v as 'NONE' | 'HALF_DAY' })}
          onEndHalfDayChange={(v) => setForm({ ...form, endHalfDay: v as 'NONE' | 'HALF_DAY' })}
          isSingleDay={!form.endDate || form.startDate === form.endDate}
        />
      )}

      {/* Live day count info card */}
      {calculatedDays !== null && (
        <div className={cn(
          "rounded-2xl p-5 flex items-center justify-between border transition-all shadow-sm",
          calculatedDays > availableBalance
            ? "bg-red-50 border-red-100"
            : "bg-emerald-50 border-emerald-100"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner",
              calculatedDays > availableBalance
                ? "bg-red-100 border-red-200 text-red-600"
                : "bg-emerald-100 border-emerald-200 text-emerald-600"
            )}>
              {calculatedDays > availableBalance ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            </div>
            <div>
              <p className={cn(
                "text-lg font-extrabold leading-none",
                calculatedDays > availableBalance ? "text-red-900" : "text-emerald-900"
              )}>
                {calculatedDays} Day{calculatedDays !== 1 ? 's' : ''}
              </p>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest mt-1",
                calculatedDays > availableBalance ? "text-red-600" : "text-emerald-600"
              )}>
                {form.isEmergency ? 'Emergency' : 'Standard'} Leave
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Remaining Balance</p>
            <p className="text-sm font-bold text-slate-700">{availableBalance} days</p>
          </div>
        </div>
      )}

      {(inlineErrors.balance || inlineErrors.overlap) && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3 text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-tight">
            {inlineErrors.balance || inlineErrors.overlap}
          </p>
        </div>
      )}

      {/* Emergency toggle card */}
      <div 
        className={cn(
          "group relative overflow-hidden rounded-2xl border transition-all cursor-pointer select-none p-5",
          form.isEmergency 
            ? "bg-red-50/50 border-red-200 shadow-sm" 
            : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
        )}
        onClick={() => setForm({ ...form, isEmergency: !form.isEmergency })}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
              form.isEmergency 
                ? "bg-red-600 border-red-600 text-white" 
                : "bg-white border-slate-300"
            )}>
              {form.isEmergency && <CheckCircle2 size={12} strokeWidth={3} />}
            </div>
            <div>
              <p className={cn(
                "text-sm font-bold transition-colors",
                form.isEmergency ? "text-red-900" : "text-slate-700"
              )}>
                Emergency Leave
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Uses emergency quota • {balance?.availableEmergency ?? 0} days left
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <label className={HEADING_STYLES.cardSubtitle + " ml-1"}>
          Extended Justification <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          rows={4}
          minLength={10}
          placeholder="Please provide a brief justification for your leave request (min. 10 characters)"
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all outline-none bg-slate-50/30 resize-none",
            inlineErrors.reason ? "border-red-200 focus:border-red-400" : "border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5"
          )}
        />
        {inlineErrors.reason && (
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight ml-1">{inlineErrors.reason}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || (calculatedDays !== null && calculatedDays > availableBalance)}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-600 text-white py-4 text-[13px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Send size={16} />
            <span>Submit Leave Request</span>
          </>
        )}
      </button>
    </form>
  )
}
