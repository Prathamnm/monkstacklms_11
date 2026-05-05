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

  // Recalculate days whenever dates change
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

    // Balance check
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

    // Overlap check (client-side advisory)
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {autoApproved && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 font-medium">
          ℹ️ As a manager, your leave is automatically approved.
        </div>
      )}

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-slate-700">Leave Title <span className="text-red-500">*</span></label>
        <input
          type="text"
          maxLength={100}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Family function, Medical appointment"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {inlineErrors.title && <p className="text-xs text-red-500 mt-1">{inlineErrors.title}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700">Start Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {inlineErrors.startDate && <p className="text-xs text-red-500 mt-1">{inlineErrors.startDate}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">End Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            min={form.startDate || new Date().toISOString().split('T')[0]}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {inlineErrors.endDate && <p className="text-xs text-red-500 mt-1">{inlineErrors.endDate}</p>}
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

      {/* Live day count */}
      {calculatedDays !== null && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          calculatedDays > availableBalance
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          This will use <strong>{calculatedDays}</strong> day{calculatedDays !== 1 ? 's' : ''}.
          You have <strong>{availableBalance}</strong> {form.isEmergency ? 'emergency' : 'standard'} days remaining.
        </div>
      )}

      {inlineErrors.balance && (
        <p className="text-xs text-red-500">{inlineErrors.balance}</p>
      )}
      {inlineErrors.overlap && (
        <p className="text-xs text-red-500">{inlineErrors.overlap}</p>
      )}

      {/* Emergency toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.isEmergency}
          onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
        />
        <span className="text-sm text-slate-700">
          Mark as Emergency Leave
          <span className="ml-1 text-xs text-slate-400">(uses your emergency balance of {balance?.availableEmergency ?? 2} days)</span>
        </span>
      </label>

      {/* Reason */}
      <div>
        <label className="text-xs font-medium text-slate-700">Reason <span className="text-red-500">*</span></label>
        <textarea
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          rows={4}
          minLength={10}
          placeholder="Please provide a brief reason for your leave (min 10 characters)"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
        />
        {inlineErrors.reason && <p className="text-xs text-red-500 mt-1">{inlineErrors.reason}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
      </button>
    </form>
  )
}
