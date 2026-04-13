'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DayPicker, DateRange } from 'react-day-picker'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { format, isEqual } from 'date-fns'
import { AlertTriangle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { computeTotalDays } from '@/lib/utils/dateUtils'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { HalfDaySelector } from '@/components/leave/HalfDaySelector'
import { PageHeader } from '@/components/shared/PageHeader'
import 'react-day-picker/dist/style.css'
import type { HalfDayType } from '@/types/leave'

export default function HRApplyLeavePage() {
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [range, setRange] = useState<DateRange | undefined>()
  const [startHalfDay, setStartHalfDay] = useState<HalfDayType>('NONE')
  const [endHalfDay, setEndHalfDay] = useState<HalfDayType>('NONE')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const isSingleDay = range?.from && range?.to
    ? isEqual(range.from, range.to)
    : !!range?.from && !range?.to

  const totalDays = range?.from
    ? computeTotalDays(
        range.from,
        range.to ?? range.from,
        startHalfDay,
        isSingleDay ? 'NONE' : endHalfDay
      )
    : 0

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!range?.from) throw new Error('Select a date range')
      const token = await getAccessToken(instance)
      const res = await fetch('/api/leave/apply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: format(range.from, 'yyyy-MM-dd'),
          endDate: format(range.to ?? range.from, 'yyyy-MM-dd'),
          startHalfDay,
          endHalfDay: isSingleDay ? 'NONE' : endHalfDay,
          reason,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to submit leave request')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully!')
      setRange(undefined)
      setStartHalfDay('NONE')
      setEndHalfDay('NONE')
      setReason('')
      setErrors([])
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] })
      router.push('/hr/my-leaves')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  function validate(): boolean {
    const errs: string[] = []
    if (!range?.from) errs.push('Please select start and end dates')
    if (reason.trim().length < 10) errs.push('Reason must be at least 10 characters')
    if (totalDays <= 0) errs.push('Selected date range contains no business days')
    setErrors(errs)
    return errs.length === 0
  }

  function handleSubmit() {
    if (validate()) applyMutation.mutate()
  }

  const disabledDays = [{ dayOfWeek: [0, 6] }]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Apply for Leave"
        description="Select dates and submit your leave request"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-slate-700 font-semibold text-sm mb-4">Select Leave Dates</h3>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={disabledDays}
              className="!font-sans"
              classNames={{
                day_selected: '!bg-blue-600 !text-white !rounded-full',
                day_range_middle: '!bg-blue-50 !text-blue-700',
                day_range_start: '!bg-blue-600 !text-white !rounded-l-full',
                day_range_end: '!bg-blue-600 !text-white !rounded-r-full',
                day_today: '!font-bold !text-blue-600',
                day_disabled: '!text-slate-300 !cursor-not-allowed',
              }}
              footer={
                range?.from && (
                  <p className="text-slate-500 text-sm text-center mt-2">
                    {range.to && !isEqual(range.from, range.to)
                      ? `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')} · ${totalDays} day${totalDays !== 1 ? 's' : ''}`
                      : `${format(range.from, 'MMMM d, yyyy')} · ${totalDays} day${totalDays !== 1 ? 's' : ''}`}
                  </p>
                )
              }
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <LeaveBalanceCard />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
          >
            <h3 className="text-slate-700 font-semibold text-sm">Leave Details</h3>

            {range?.from && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <Info size={14} />
                  <span className="font-medium">
                    {range.to && !isEqual(range.from, range.to)
                      ? `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`
                      : format(range.from, 'MMMM d, yyyy')}
                  </span>
                </div>
                <p className="text-blue-600 text-xs mt-1 ml-5">
                  Total: <strong>{totalDays} day{totalDays !== 1 ? 's' : ''}</strong>
                </p>
              </div>
            )}

            {range?.from && (
              <HalfDaySelector
                startHalfDay={startHalfDay}
                endHalfDay={endHalfDay}
                onStartHalfDayChange={setStartHalfDay}
                onEndHalfDayChange={setEndHalfDay}
                isSingleDay={isSingleDay}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please describe the reason for your leave request..."
                rows={4}
                maxLength={500}
                className="input w-full resize-none"
              />
              <p className="text-slate-400 text-xs mt-1 text-right">{reason.length}/500</p>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-red-700 text-xs">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={applyMutation.isPending || !range?.from}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applyMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Leave Request'
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
