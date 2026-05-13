'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
  addMonths,
  isSameMonth,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns'
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

interface AttendanceRecord {
  id: string
  date: string
  punchIn: string | null
  punchOut: string | null
  hoursWorked: number | null
}

interface Holiday {
  id: string
  date: string
  name: string
  type: string
}

function statusFromHours(hours: number | null, isWeekend: boolean, holidayName?: string): { label: string; color: string } {
  if (holidayName) return { label: 'Holiday', color: '#8B5CF6' }
  if (isWeekend) return { label: 'Weekend', color: '#94A3B8' }
  if (hours === null) return { label: 'No data', color: '#DC2626' }
  if (hours >= 6) return { label: 'Full day', color: '#15803D' }
  if (hours >= 3) return { label: 'Half day', color: '#D97706' }
  return { label: 'Absent', color: '#DC2626' }
}

export function AttendanceCard() {
  const { instance } = useMsal()
  const { data: currentUserData } = useCurrentUser()
  const joinDate = currentUserData?.user?.joinDate ? parseISO(String(currentUserData.user.joinDate)) : new Date(2000, 0, 1)

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()))
  const monthKey = format(viewMonth, 'yyyy-MM')

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'month', monthKey],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/attendance?month=${encodeURIComponent(monthKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 60 * 1000,
  })

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['holidays', monthKey],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const byDate = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    for (const r of records) {
      m.set(format(parseISO(r.date), 'yyyy-MM-dd'), r)
    }
    return m
  }, [records])

  const holidaysByDate = useMemo(() => {
    const m = new Map<string, Holiday>()
    for (const h of holidays) {
      m.set(format(parseISO(h.date), 'yyyy-MM-dd'), h)
    }
    return m
  }, [holidays])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const validRecords = records.filter(r => r.hoursWorked !== null)
  const avgHours =
    validRecords.length > 0
      ? Math.round((validRecords.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0) / validRecords.length) * 10) / 10
      : null

  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const handlePrevMonth = () => {
    setViewMonth(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setViewMonth(prev => addMonths(prev, 1))
  }

  const isCurrentMonth = isSameMonth(viewMonth, new Date())
  const isJoinMonth = isSameMonth(viewMonth, joinDate) || isBefore(viewMonth, startOfMonth(joinDate))

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
            <Clock size={15} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider leading-none">
              Attendance
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-none">
              {avgHours !== null ? `Avg ${avgHours}h / recorded day` : 'No data recorded yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            disabled={isJoinMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-500"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[12px] font-semibold text-slate-700 min-w-[88px] text-center">
            {format(viewMonth, 'MMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-500"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="border border-[var(--color-card-border)] rounded-xl overflow-hidden bg-slate-50/50">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-100/80 border-b border-[var(--color-card-border)] text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <span className="col-span-4">Date</span>
            <span className="col-span-4">Punch In/Out</span>
            <span className="col-span-2 text-center">Hours</span>
            <span className="col-span-2 text-right">Status</span>
          </div>

          <div className="max-h-[380px] overflow-y-auto no-scrollbar">
            {calendarDays.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd')
              const rec = byDate.get(key)
              const holiday = holidaysByDate.get(key)
              const isWeekendDay = getDay(day) === 0 || getDay(day) === 6
              const st = statusFromHours(rec?.hoursWorked ?? null, isWeekendDay, holiday?.name)
              const isToday = key === todayKey
              const isFuture = isBefore(startOfDay(new Date()), day)

              if (isFuture && st.label === 'No data') {
                st.label = '—'
              }

              const getStatusStyles = (label: string) => {
                switch (label) {
                  case 'Full day': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  case 'Half day': return 'bg-amber-100 text-amber-700 border-amber-200'
                  case 'Holiday': return 'bg-purple-100 text-purple-700 border-purple-200'
                  case 'Weekend': return 'bg-slate-100 text-slate-500 border-slate-200'
                  case 'Absent':
                  case 'No data': return 'bg-red-100 text-red-700 border-red-200'
                  default: return 'bg-transparent text-slate-400'
                }
              }

              return (
                <div
                  key={key}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-4 py-3 text-xs border-b border-[var(--color-card-border)] items-center transition-colors",
                    isToday ? "bg-blue-50/50" : (idx % 2 === 0 ? "bg-transparent" : "bg-white/40"),
                    "hover:bg-slate-50/80"
                  )}
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <span className="font-bold text-slate-700">
                      {format(day, 'EEE, MMM d')}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">Today</span>
                    )}
                  </div>
                  
                  <div className="col-span-4 text-slate-500 font-medium">
                    {rec?.punchIn ? (
                      <div className="flex items-center gap-1">
                        <span>{format(parseISO(rec.punchIn), 'hh:mm a')}</span>
                        <span className="opacity-30">→</span>
                        <span>{rec?.punchOut ? format(parseISO(rec.punchOut), 'hh:mm a') : '??'}</span>
                      </div>
                    ) : (
                      <span className="opacity-20 text-[10px]">NO PUNCH DATA</span>
                    )}
                  </div>

                  <div className="col-span-2 text-center font-bold text-slate-700">
                    {rec?.hoursWorked != null ? `${rec.hoursWorked}h` : ''}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    {st.label !== '—' ? (
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-tight border",
                        getStatusStyles(st.label)
                      )}>
                        {st.label === 'Holiday' ? (holiday?.name || 'Holiday') : st.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold tracking-widest">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
