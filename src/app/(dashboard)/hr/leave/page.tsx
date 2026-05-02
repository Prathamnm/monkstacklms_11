'use client'

import { DateRange } from 'react-day-picker'
import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
} from 'date-fns'
import { AlertTriangle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { TeamLeaveOverviewCard } from '@/components/leave/TeamLeaveOverviewCard'
import { HalfDaySelector } from '@/components/leave/HalfDaySelector'
import { LeaveCalendarPicker } from '@/components/leave/LeaveCalendarPicker'
import { MyLeavesView } from '@/components/leave/MyLeavesView'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveRulesModal } from '@/components/leave/LeaveRulesModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamLeaveOverview } from '@/hooks/useTeamLeaveOverview'
import type { HalfDayType } from '@/types/leave'
import type { PublicHoliday } from '@/types/holiday'
import type { LeaveRequest } from '@/types/leave'

interface DayOverride {
  date: string
  type: 'full' | 'half'
}

export default function HRLeavePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'apply' | 'requests'>('apply')

  // Handle URL parameter for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'requests') {
      setActiveTab('requests')
    }
  }, [searchParams])

  const [range, setRange] = useState<DateRange | undefined>()
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())
  const [startHalfDay, setStartHalfDay] = useState<HalfDayType>('NONE')
  const [endHalfDay, setEndHalfDay] = useState<HalfDayType>('NONE')
  const [reason, setReason] = useState('')
  const [title, setTitle] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [hoveredDayInfo, setHoveredDayInfo] = useState<string | null>(null)
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([])

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
    queryKey: ['myLeaves', 'self'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: leaveBalance } = useQuery({
    queryKey: ['leaveBalance'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/leave/balance', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch leave balance')
      return res.json()
    },
    refetchInterval: 30 * 1000, // Poll every 30 seconds for real-time updates
    staleTime: 25 * 1000,
  })

  const pendingCount = useMemo(() => 
    existingLeaves.filter(l => l.status === 'PENDING').length,
    [existingLeaves]
  )

  const isSingleDay = range?.from && range?.to
    ? isEqual(range.from, range.to)
    : !!range?.from && !range?.to

  const totalDays = useMemo(() => {
    if (!range?.from) return 0
    
    const start = range.from
    const end = range.to || range.from
    
    const startValue = startHalfDay === 'HALF_DAY' ? 0.5 : 1.0
    const endValue = endHalfDay === 'HALF_DAY' ? 0.5 : 1.0
    
    if (isEqual(start, end)) {
      return startValue
    }
    
    // Count working days between start and end (exclusive)
    const interiorDays = eachDayOfInterval({ 
      start: new Date(start.getTime() + 86400000), 
      end: new Date(end.getTime() - 86400000) 
    }).filter(day => !isWeekend(day)).length
    
    // Subtract 0.5 for each toggled interior date
    const interiorToggles = dayOverrides.filter(o => {
      const d = parseISO(o.date)
      return d > start && d < end && o.type === 'half'
    }).length
    
    const interiorWorkingDays = interiorDays - (interiorToggles * 0.5)
    
    return startValue + interiorWorkingDays + endValue
  }, [range, startHalfDay, endHalfDay, dayOverrides])

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
          startDateType: startHalfDay === 'HALF_DAY' ? 'half' : 'full',
          endDateType: isSingleDay ? 'full' : (endHalfDay === 'HALF_DAY' ? 'half' : 'full'),
          dayOverrides,
          totalDays,
          reason,
          isEmergency,
          managerId: currentUser?.user.managerId,
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
      toast.success('Leave request submitted successfully.')
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves', 'self'] })
      // Reset form and switch to requests tab
      setRange(undefined)
      setReason('')
      setTitle('')
      setIsEmergency(false)
      setDayOverrides([])
      setActiveTab('requests')
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
        (interval.start >= start && interval.start <= end) ||
        (start >= interval.start && start <= interval.end) ||
        (end >= interval.start && end <= interval.end)
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

  return (
    <div className="leave-page" style={{ padding: '24px', marginLeft: '0' }}>
      {/* Sticky Balance Strip */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Available days</p>
            <p style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {leaveBalance?.availableStandard ?? '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Used days</p>
            <p style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {leaveBalance?.standardUsed ?? '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Pending days</p>
            <p style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {leaveBalance?.pendingDays ?? '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Emergency quota</p>
            <p style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {leaveBalance?.availableEmergency ?? 0}/2
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Floater quota</p>
            <p style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {leaveBalance?.availableFloater ?? 0}/2
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        paddingBottom: '16px',
      }}>
        <button
          onClick={() => setActiveTab('apply')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'apply' ? 'var(--color-background-info)' : 'transparent',
            color: activeTab === 'apply' ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Apply for leave
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'requests' ? 'var(--color-background-info)' : 'transparent',
            color: activeTab === 'requests' ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          My requests
          {pendingCount > 0 && (
            <span style={{
              background: 'var(--color-background-warning)',
              color: 'var(--color-text-warning)',
              padding: '2px 6px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'apply' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 18, color: 'var(--color-heading)', margin: 0 }}>
                Apply for Leave
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Submit your leave request for approval
              </p>
            </div>
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
              }}
            >
              Leave Rules
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            {/* Calendar Section */}
            <div>
              <div className="calendar-card">
                <div className="flex flex-col md:flex-row md:items-stretch">
                  <div className="md:w-[55%] md:pr-5">
                    <LeaveCalendarPicker
                      selected={range}
                      onSelect={setRange}
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
                      calendarHref="/hr/leave"
                      variant="embedded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Details Section */}
            <div>
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
        </motion.div>
      )}

      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <MyLeavesView role="HR" initialLeaves={existingLeaves} />
        </motion.div>
      )}

      <LeaveRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
