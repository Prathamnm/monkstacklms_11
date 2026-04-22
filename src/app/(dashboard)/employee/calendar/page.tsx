'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO, isSameMonth } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { motion } from 'framer-motion'

import type { PublicHoliday } from '@/types/holiday'
import type { LeaveRequest } from '@/types/leave'

function CalendarGrid({ month, year, publicHolidays, approvedLeaveDates }: {
  month: number; year: number
  publicHolidays: PublicHoliday[]
  approvedLeaveDates: string[]
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Mon start

  const holidayMap = new Map<string, PublicHoliday>()
  publicHolidays.forEach((h) => { holidayMap.set(new Date(h.date).toDateString(), h) })
  const leaveDateSet = new Set(approvedLeaveDates.map((d) => new Date(d).toDateString()))

  const days: (number | null)[] = [...Array(startPad).fill(null)]
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="grid grid-cols-7 mb-2">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={`pad-${i}`} />
          const dateObj = new Date(year, month, d)
          const holiday = holidayMap.get(dateObj.toDateString())
          const isOnLeave = leaveDateSet.has(dateObj.toDateString())
          const isWeekendDay = dateObj.getDay() === 0 || dateObj.getDay() === 6
          const isToday = new Date().toDateString() === dateObj.toDateString()
          return (
            <div key={d} className={`relative flex flex-col items-center py-1 rounded-lg ${isWeekendDay ? 'opacity-40' : ''} ${isToday ? 'bg-blue-50 ring-1 ring-blue-400' : ''}`}>
              <span className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>{d}</span>
              <div className="flex gap-0.5 mt-0.5">
                {holiday && (
                  <span title={holiday.name} className={`w-2 h-2 rounded-full ${holiday.type === 'PUBLIC' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                )}
                {isOnLeave && <span title="You're on leave" className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function EmployeeCalendarPage() {
  const { instance } = useMsal()
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const { data: holidays = [] } = useQuery<PublicHoliday[]>({
    queryKey: ['publicHolidays'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: leaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })



  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const approvedLeaveDates = leaves
    .filter(l => l.status === 'APPROVED')
    .flatMap(l => {
      const dates: string[] = []
      const s = new Date(l.startDate)
      const e = new Date(l.endDate)
      const cur = new Date(s)
      while (cur <= e) { dates.push(cur.toISOString()); cur.setDate(cur.getDate() + 1) }
      return dates
    })

  const thisMonthHolidays = holidays.filter(h => {
    const d = parseISO(h.date)
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear
  })

  const upcomingLeaves = leaves
    .filter(l => ['PENDING','APPROVED'].includes(l.status) && new Date(l.startDate) >= now)
    .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 lg:p-6 space-y-4"
    >
      <PageHeader title="My Calendar" description="View your leave schedule and public holidays." />

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            {format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">‹</button>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">›</button>
          </div>
        </div>

        <CalendarGrid month={viewMonth} year={viewYear} publicHolidays={holidays} approvedLeaveDates={approvedLeaveDates} />

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Public Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Floater Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> On Leave</span>

        </div>
      </div>

      {/* Holidays this month */}
      {thisMonthHolidays.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Holidays This Month</h3>
          <div className="space-y-2">
            {thisMonthHolidays.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{h.type === 'PUBLIC' ? '🔴' : '🟡'}</span>
                  <span className="font-medium text-slate-800">{h.name}</span>
                </div>
                <span className="text-slate-500">{format(parseISO(h.date), 'dd MMM')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming leaves */}
      {upcomingLeaves.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Upcoming Leaves</h3>
          <div className="space-y-2">
            {upcomingLeaves.map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-800 font-medium">{l.title || 'Leave'}</span>
                <span className="text-slate-500">
                  {format(parseISO(l.startDate), 'dd MMM')} → {format(parseISO(l.endDate), 'dd MMM')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


    </motion.div>
  )
}
