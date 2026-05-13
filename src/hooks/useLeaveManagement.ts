'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DateRange } from 'react-day-picker'
import {
  eachDayOfInterval,
  format,
  isEqual,
  isSameDay,
  isWeekend,
  parseISO,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamLeaveOverview } from '@/hooks/useTeamLeaveOverview'
import type { HalfDayType, LeaveRequest, DayOverride } from '@/types/leave'
import type { PublicHoliday } from '@/types/holiday'

export function useLeaveManagement() {
  const searchParams = useSearchParams()
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'apply' | 'requests'>('apply')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'requests') setActiveTab('requests')
  }, [searchParams])

  const [range, setRange] = useState<DateRange | undefined>()
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())
  const [startHalfDay, setStartHalfDay] = useState<HalfDayType>('NONE')
  const [endHalfDay, setEndHalfDay] = useState<HalfDayType>('NONE')
  const [reason, setReason] = useState('')
  const [title, setTitle] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([])

  const { data: currentUser } = useCurrentUser()
  const role = currentUser?.user.role ?? 'EMPLOYEE'

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
    refetchInterval: 30 * 1000,
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
    const days = eachDayOfInterval({ start, end })
    const businessDaysCount = days.filter((day) => !isWeekend(day)).length

    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')

    const halfDayDates = new Set<string>()
    if (startHalfDay === 'HALF_DAY') halfDayDates.add(startStr)
    if (endHalfDay === 'HALF_DAY' && range.to && !isSameDay(range.from, range.to)) halfDayDates.add(endStr)
    dayOverrides.forEach(o => {
      if (o.type === 'half') halfDayDates.add(o.date)
    })

    const halfDayCount = Array.from(halfDayDates).filter(dStr => {
      const d = parseISO(dStr)
      const isInRange = d >= start && d <= end
      return isInRange && !isWeekend(d)
    }).length

    const total = businessDaysCount - (halfDayCount * 0.5)
    return Math.max(0.5, total)
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
        const data = await res.json().catch(() => ({}))
        const err = new Error(data.error ?? 'Failed to submit leave request') as any
        err.code = data.code
        throw err
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully.')
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves', 'self'] })
      setRange(undefined)
      setReason('')
      setTitle('')
      setIsEmergency(false)
      setDayOverrides([])
      setActiveTab('requests')
    },
    onError: (err: any) => {
      if (err.code === 'SANDWICH_RULE') {
        setErrors([err.message])
        return
      }
      toast.error(err.message)
    },
  })

  const conflictCount = useMemo(() => {
    if (!range?.from) return 0
    const singleDay = range.to ? isEqual(range.from, range.to) : true
    const interval = { start: range.from, end: range.to ?? range.from }

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
  }, [range, teamOverview])

  const validate = () => {
    const errs: string[] = []
    if (!range?.from) errs.push('Please select start and end dates')
    if (reason.trim().length < 10) errs.push('Reason must be at least 10 characters')
    if (totalDays <= 0) errs.push('Selected date range contains no business days')
    setErrors(errs)
    return errs.length === 0
  }

  const handleSubmit = () => {
    setErrors([])
    if (validate()) applyMutation.mutate()
  }

  return {
    activeTab,
    setActiveTab,
    range,
    setRange,
    visibleMonth,
    setVisibleMonth,
    startHalfDay,
    setStartHalfDay,
    endHalfDay,
    setEndHalfDay,
    reason,
    setReason,
    title,
    setTitle,
    isEmergency,
    setIsEmergency,
    errors,
    dayOverrides,
    setDayOverrides,
    leaveBalance,
    holidays,
    existingLeaves,
    pendingCount,
    totalDays,
    conflictCount,
    isSubmitDisabled: applyMutation.isPending || !range?.from || reason.trim().length < 10 || totalDays <= 0,
    isSubmitting: applyMutation.isPending,
    handleSubmit,
    windowFrom,
    windowTo,
  }
}
