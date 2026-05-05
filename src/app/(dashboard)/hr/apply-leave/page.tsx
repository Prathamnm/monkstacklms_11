'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isEqual,
  isWeekend,
  parseISO,
  startOfMonth,
  isSameDay,
  isWithinInterval,
} from 'date-fns'
import { AlertTriangle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { DayPicker, DateRange } from 'react-day-picker'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { TeamLeaveOverviewCard } from '@/components/leave/TeamLeaveOverviewCard'
import { HalfDaySelector } from '@/components/leave/HalfDaySelector'
import { LeaveCalendarPicker } from '@/components/leave/LeaveCalendarPicker'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveRulesModal } from '@/components/leave/LeaveRulesModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamLeaveOverview } from '@/hooks/useTeamLeaveOverview'
import { computeTotalDays } from '@/lib/utils/dateUtils'
import type { HalfDayType, LeaveRequest } from '@/types/leave'
import type { PublicHoliday } from '@/types/holiday'

interface DayOverride {
  date: string
  type: 'full' | 'half'
}

export default function HRApplyLeavePage() {
  const router = useRouter()
  const { instance } = useMsal()
  const queryClient = useQueryClient()

  const [range, setRange] = useState<DateRange | undefined>()
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())
  const [startHalfDay, setStartHalfDay] = useState<HalfDayType>('NONE')
  const [endHalfDay, setEndHalfDay] = useState<HalfDayType>('NONE')
  const [halfDayDates, setHalfDayDates] = useState<string[]>([])
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([])
  const [reason, setReason] = useState('')
  const [title, setTitle] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [hoveredDayInfo, setHoveredDayInfo] = useState<string | null>(null)

  // Used to intercept onSelect when an inner date half-day click fires
  const halfDayClickRef = useRef(false)

  const { data: currentUser } = useCurrentUser()
  const role = currentUser?.user.role ?? 'HR'

  const windowFrom = useMemo(() => startOfMonth(visibleMonth), [visibleMonth])
  const windowTo = useMemo(() => endOfMonth(visibleMonth), [visibleMonth])

  const { data: teamOverview = [] } = useTeamLeaveOverview({
    from: windowFrom,
    to: windowTo,
    scope: role,
  })

  const { data: holidays = [] } = useQuery<PublicHoliday[]>({
    queryKey: ['publicHolidays'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: existingLeaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaves', role],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const publicHolidays = useMemo(
    () => holidays.filter((h) => h.type === 'PUBLIC').map((h) => parseISO(h.date)),
    [holidays]
  )
  const floaterHolidays = useMemo(
    () => holidays.filter((h) => h.type === 'FLOATER').map((h) => parseISO(h.date)),
    [holidays]
  )
  const pendingLeaveDays = useMemo(
    () =>
      existingLeaves
        .filter((l) => l.status === 'PENDING')
        .flatMap((l) =>
          eachDayOfInterval({ start: parseISO(l.startDate), end: parseISO(l.endDate) })
        ),
    [existingLeaves]
  )
  const approvedLeaveDays = useMemo(
    () =>
      existingLeaves
        .filter((l) => l.status === 'APPROVED')
        .flatMap((l) =>
          eachDayOfInterval({ start: parseISO(l.startDate), end: parseISO(l.endDate) })
        ),
    [existingLeaves]
  )

  const isSingleDay = range?.from && range?.to
    ? isEqual(range.from, range.to)
    : !!range?.from && !range?.to

  // A confirmed range means both ends are set and different
  const hasConfirmedRange = !!(range?.from && range?.to && !isEqual(range.from, range.to))

  // Show hint only for ranges > 1 calendar day (inner dates exist)
  const rangeDaySpan = hasConfirmedRange
    ? Math.round(Math.abs(range!.to!.getTime() - range!.from!.getTime()) / 86_400_000)
    : 0
  const showHalfDayHint = rangeDaySpan > 1

  const totalDays = useMemo(() => {
    if (!range?.from) return 0
    
    const start = range.from
    const end = range.to || range.from
    
    // Count business days (excluding weekends)
    const days = eachDayOfInterval({ start, end })
    const businessDays = days.filter(day => !isWeekend(day))
    const businessDaysCount = businessDays.length

    // Start/End half days (from props)
    const startAdjust = startHalfDay === 'HALF_DAY' ? 0.5 : 0
    const endAdjust = (!range.to || isSameDay(range.from, range.to)) ? 0 : (endHalfDay === 'HALF_DAY' ? 0.5 : 0)
    
    // Inner half days (from overrides)
    const innerHalfCount = dayOverrides.filter(o => {
      const dStr = o.date
      const startStr = format(range.from!, 'yyyy-MM-dd')
      const endStr = range.to ? format(range.to, 'yyyy-MM-dd') : ''
      return dStr !== startStr && dStr !== endStr && o.type === 'half'
    }).length

    const total = businessDaysCount - startAdjust - endAdjust - (innerHalfCount * 0.5)
    return Math.max(0.5, total)
  }, [range, startHalfDay, endHalfDay, dayOverrides])

  function toggleHalfDay(dateStr: string) {
    if (!range?.from || !range?.to) return
    const startStr = format(range.from, 'yyyy-MM-dd')
    const endStr = format(range.to, 'yyyy-MM-dd')
    if (dateStr === startStr || dateStr === endStr) return
    setHalfDayDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    )
  }

  // Intercept DayPicker day clicks: if a full range exists and the clicked day
  // is an inner (non-weekend) date, toggle its half-day state instead of
  // resetting the range. The ref flag tells handleSelect to skip the update.
  function handleDayClick(day: Date, modifiers: Record<string, boolean>) {
    if (modifiers.disabled || modifiers.outside) return
    if (!hasConfirmedRange) return
    if (isWeekend(day)) return

    const dayStr = format(day, 'yyyy-MM-dd')
    const startStr = format(range!.from!, 'yyyy-MM-dd')
    const endStr = format(range!.to!, 'yyyy-MM-dd')

    // Only inner dates (not the endpoints)
    if (dayStr !== startStr && dayStr !== endStr) {
      if (isWithinInterval(day, { start: range!.from!, end: range!.to! })) {
        halfDayClickRef.current = true
        toggleHalfDay(dayStr)
      }
    }
  }

  function handleSelect(newRange: DateRange | undefined) {
    if (halfDayClickRef.current) {
      halfDayClickRef.current = false
      return // keep existing range — this was a half-day toggle, not a new selection
    }
    setRange(newRange)
    setHalfDayDates([]) // reset inner half-day marks whenever range changes
  }

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
          title: title.trim() || 'Leave Request',
          startDate: format(range.from, 'yyyy-MM-dd'),
          endDate: format(range.to ?? range.from, 'yyyy-MM-dd'),
          startHalfDay,
          endHalfDay: isSingleDay ? 'NONE' : endHalfDay,
          dayOverrides,
          totalDays,
          reason,
          isEmergency,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        const err = new Error(data.error ?? 'Failed to submit leave request') as Error & {
          code?: string
        }
        err.code = data.code
        throw err
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully!')
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] })
      router.push('/hr/my-leaves')
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'SANDWICH_RULE') {
        setErrors([err.message])
        return
      }
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
    setErrors([])
    if (validate()) applyMutation.mutate()
  }

  const disabledDays = [{ dayOfWeek: [0, 6] }]

  const conflictCount = useMemo(() => {
    if (!range?.from) return 0
    const singleDay = range.to ? isEqual(range.from, range.to) : true
    const interval = singleDay
      ? { start: range.from, end: range.from }
      : { start: range.from, end: range.to ?? range.from }

    const overlapping = new Set<string>()
    for (const rec of teamOverview) {
      const start = parseISO(rec.startDate)
      const end = parseISO(rec.endDate)
      if (
        isWithinInterval(interval.start, { start, end }) ||
        isWithinInterval(start, interval) ||
        isWithinInterval(end, interval)
      ) {
        overlapping.add(rec.employeeId)
      }
    }
    return overlapping.size
  }, [range?.from, range?.to, teamOverview])

  const isSubmitDisabled =
    applyMutation.isPending ||
    !range?.from ||
    reason.trim().length < 10 ||
    totalDays <= 0

  const halfDayModifier = halfDayDates.map((d) => parseISO(d))

  return (
    <div className="apply-leave-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <PageHeader
          title="Apply for Leave"
          description="Select dates and submit your leave request"
        />
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          style={{
            background: 'var(--icon-pill-blue-bg)',
            color: 'var(--icon-pill-blue-stroke)',
            border: '1px solid #BFDBFE',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          Leave Rules
        </button>
      </div>

      <div className="apply-leave-grid">
        {/* Calendar – 3/5 */}
        <div className="apply-leave-left">
          <div className="calendar-card">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className="md:w-[55%] md:pr-5">
            <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-heading)', marginBottom: 16 }}>Select Leave Dates</h3>
            <LeaveCalendarPicker
              selected={range}
              onSelect={handleSelect}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              holidays={holidays}
              existingLeaves={existingLeaves}
              dayOverrides={dayOverrides}
              onDayOverrideChange={setDayOverrides}
              startHalfDay={startHalfDay}
              endHalfDay={endHalfDay}
              disabled={[{ dayOfWeek: [0, 6] }]}
              showOutsideDays={true}
              numberOfMonths={1}
            />

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 12,
                fontSize: 11,
                color: 'var(--color-muted)',
              }}
            >
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#FEE2E2',
                    marginRight: 4,
                  }}
                />
                Public Holiday
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#FEF9C3',
                    marginRight: 4,
                  }}
                />
                Floater
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#BFDBFE',
                    marginRight: 4,
                  }}
                />
                Selected
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#FED7AA',
                    marginRight: 4,
                  }}
                />
                Pending
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#BBF7D0',
                    marginRight: 4,
                  }}
                />
                Approved
              </span>
            </div>

            {conflictCount > 0 && range?.from && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-900 text-sm">
                  <AlertTriangle size={14} className="text-amber-600" />
                  {conflictCount} teammate{conflictCount !== 1 ? 's' : ''} also on leave{' '}
                  {range.to && !isEqual(range.from, range.to) ? 'during these dates.' : 'on this date.'}
                </div>
              </div>
            )}
              </div>

              <div className="hidden md:block w-px" style={{ background: 'var(--color-card-border)' }} aria-hidden="true" />

              <div className="md:w-[45%] md:pl-5 mt-5 md:mt-0">
                <TeamLeaveOverviewCard
                  from={windowFrom}
                  to={windowTo}
                  calendarHref="/hr/apply-leave"
                  variant="embedded"
                />
              </div>
            </div>
          </div>

          <LeaveBalanceCard variant="strip" />
        </div>


        <div className="apply-leave-right">
          {hoveredDayInfo && (
            <div
              style={{
                background: '#1E293B',
                color: '#F8FAFC',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              {hoveredDayInfo}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="leave-details-card"
          >
            <div className="leave-details-title">Leave Details</div>

            <div className="reason-field" style={{ marginBottom: 8 }}>
              <label className="reason-label">Leave title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual leave, Medical"
                className="reason-textarea"
                style={{ height: 40, minHeight: 40 }}
                maxLength={120}
              />
            </div>

            {/* Date summary */}
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
                  {halfDayDates.length > 0 && (
                    <span className="text-blue-500 ml-1">
                      ({halfDayDates.length} half day{halfDayDates.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Half day selector */}
            {range?.from && (
              <HalfDaySelector
                startHalfDay={startHalfDay}
                endHalfDay={endHalfDay}
                onStartHalfDayChange={setStartHalfDay}
                onEndHalfDayChange={setEndHalfDay}
                isSingleDay={isSingleDay}
              />
            )}

            {/* Reason */}
            <div className="reason-field">
              <label className="reason-label">
                Reason <span className="reason-required-dot">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please describe the reason for your leave request..."
                maxLength={500}
                className="reason-textarea"
              />
              <span className="char-count">{reason.length}/500</span>
            </div>

            {/* Emergency Toggle */}
            <label className="emergency-row">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="emergency-checkbox"
              />
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
              <span className="emergency-label">This is an Emergency Leave</span>
            </label>

            {/* Errors */}
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

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="submit-button"
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

      <LeaveRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
