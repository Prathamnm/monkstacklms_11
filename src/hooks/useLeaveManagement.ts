'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamLeaveOverview } from '@/hooks/useTeamLeaveOverview'
import type { LeaveRequest, DayOverride } from '@/types/leave'
import type { PublicHoliday } from '@/types/holiday'
import { getString, isRecord } from '@/lib/utils/typeGuards'

type CodedError = Error & { code?: string }

export function useLeaveManagement(options?: { onSuccess?: () => void }) {
  const searchParams = useSearchParams()
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'apply' | 'requests'>('apply')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'requests') setActiveTab('requests')
  }, [searchParams])

  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())
  const [reason, setReason] = useState('')
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

  const totalDays = useMemo(() => {
    return dayOverrides.reduce((sum, o) => sum + (o.type === 'half' ? 0.5 : 1.0), 0)
  }, [dayOverrides])

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (dayOverrides.length === 0) throw new Error('Select at least one date')
      const token = await getAccessToken(instance)
      
      // Calculate min/max for legacy range fields, though overrides carry the real data
      const sortedDates = dayOverrides.map(o => parseISO(o.date)).sort((a, b) => a.getTime() - b.getTime())
      const startDate = format(sortedDates[0], 'yyyy-MM-dd')
      const endDate = format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd')

      const res = await fetch('/api/leave/apply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Leave Request',
          startDate,
          endDate,
          dayOverrides,
          totalDays,
          reason,
          isEmergency,
          managerId: currentUser?.user.managerId,
        }),
      })
      if (!res.ok) {
        const dataUnknown = await res.json().catch(() => ({} as unknown))
        const message = isRecord(dataUnknown) ? getString(dataUnknown, 'error') : undefined
        const code = isRecord(dataUnknown) ? getString(dataUnknown, 'code') : undefined

        const error: CodedError = new Error(message ?? 'Failed to submit leave request')
        error.code = code
        throw error
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully.')
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves', 'self'] })
      setSelectedDates([])
      setDayOverrides([])
      setReason('')
      setIsEmergency(false)
      setActiveTab('requests')
      options?.onSuccess?.()
    },
    onError: (err: unknown) => {
      const codedErr = err as Partial<CodedError>
      const code = typeof codedErr.code === 'string' ? codedErr.code : undefined

      if (code === 'SANDWICH_RULE') {
        setErrors([codedErr instanceof Error ? codedErr.message : 'Request blocked by rule'])
        return
      }
      toast.error(err instanceof Error ? err.message : 'Failed to submit leave request')
    },
  })

  const conflictCount = useMemo(() => {
    if (dayOverrides.length === 0) return 0
    const overlapping = new Set<string>()
    const selectedDateStrs = new Set(dayOverrides.map(o => o.date))

    for (const rec of teamOverview) {
      const start = parseISO(rec.startDate)
      const end = parseISO(rec.endDate)
      const days = eachDayOfInterval({ start, end })
      
      const hasOverlap = days.some(d => selectedDateStrs.has(format(d, 'yyyy-MM-dd')))
      if (hasOverlap) {
        overlapping.add(rec.employeeId)
      }
    }
    return overlapping.size
  }, [dayOverrides, teamOverview])

  const validate = () => {
    const errs: string[] = []
    if (dayOverrides.length === 0) errs.push('Please select at least one date')
    if (reason.trim().length < 10) errs.push('Reason must be at least 10 characters')
    if (totalDays <= 0) errs.push('Selection contains no valid days')
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
    selectedDates,
    setSelectedDates,
    visibleMonth,
    setVisibleMonth,
    reason,
    setReason,
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
    isSubmitDisabled: applyMutation.isPending || dayOverrides.length === 0 || reason.trim().length < 10 || totalDays <= 0,
    isSubmitting: applyMutation.isPending,
    handleSubmit,
    windowFrom,
    windowTo,
  }
}
