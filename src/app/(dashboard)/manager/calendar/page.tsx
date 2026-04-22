'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { CreateHolidayModal } from '@/components/calendar/CreateHolidayModal'
import { motion } from 'framer-motion'

import type { PublicHoliday } from '@/types/holiday'

interface LeaveWithEmployee {
  startDate: string
  endDate: string
  status: string
  employee?: { displayName: string }
}

function CalendarGrid({ month, year, publicHolidays, approvedLeaves, pendingLeaves }: {
  month: number; year: number
  publicHolidays: PublicHoliday[]
  approvedLeaves: Array<{ startDate: string; endDate: string; employeeName: string }>
  pendingLeaves: Array<{ startDate: string; endDate: string; employeeName: string }>
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const holidayMap = new Map<string, PublicHoliday>()
  publicHolidays.forEach((h) => { holidayMap.set(new Date(h.date).toDateString(), h) })

  // Build map: date string → array of names
  const approvedLeaveMap = new Map<string, string[]>()
  approvedLeaves.forEach(l => {
    const cur = new Date(l.startDate)
    while (cur <= new Date(l.endDate)) {
      const key = cur.toDateString()
      approvedLeaveMap.set(key, [...(approvedLeaveMap.get(key) ?? []), l.employeeName])
      cur.setDate(cur.getDate() + 1)
    }
  })

  const pendingLeaveMap = new Map<string, string[]>()
  pendingLeaves.forEach(l => {
    const cur = new Date(l.startDate)
    while (cur <= new Date(l.endDate)) {
      const key = cur.toDateString()
      pendingLeaveMap.set(key, [...(pendingLeaveMap.get(key) ?? []), l.employeeName])
      cur.setDate(cur.getDate() + 1)
    }
  })

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
          const namesOnLeave = approvedLeaveMap.get(dateObj.toDateString()) ?? []
          const namesPending = pendingLeaveMap.get(dateObj.toDateString()) ?? []
          const isWeekendDay = dateObj.getDay() === 0 || dateObj.getDay() === 6
          const isToday = new Date().toDateString() === dateObj.toDateString()
          return (
            <div key={d} className={`relative flex flex-col items-center py-1 rounded-lg ${isWeekendDay ? 'opacity-40' : ''} ${isToday ? 'bg-blue-50 ring-1 ring-blue-400' : ''}`}>
              <span className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>{d}</span>
              <div className="flex gap-0.5 mt-0.5">
                {holiday && <span title={holiday.name} className={`w-2 h-2 rounded-full ${holiday.type === 'PUBLIC' ? 'bg-red-500' : 'bg-yellow-400'}`} />}
                {namesOnLeave.length > 0 && (
                  <span
                    title={namesOnLeave.join(', ')}
                    className="w-2 h-2 rounded-full bg-blue-500 cursor-help"
                  />
                )}
                {namesOnLeave.length === 0 && namesPending.length > 0 && (
                  <span
                    title={namesPending.join(', ')}
                    className="w-2 h-2 rounded-full bg-amber-500 cursor-help"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ManagerCalendarPage() {
  const { instance } = useMsal()
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [showHolidayModal, setShowHolidayModal] = useState(false)

  const { data: holidays = [] } = useQuery<PublicHoliday[]>({
    queryKey: ['publicHolidays'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: leaves = [] } = useQuery<LeaveWithEmployee[]>({
    queryKey: ['managerTeamLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1)
  }

  const approvedLeaves = leaves
    .filter(l => l.status === 'APPROVED')
    .map(l => ({ startDate: l.startDate, endDate: l.endDate, employeeName: l.employee?.displayName ?? 'Unknown' }))

  const pendingLeaves = leaves
    .filter(l => l.status === 'PENDING')
    .map(l => ({ startDate: l.startDate, endDate: l.endDate, employeeName: l.employee?.displayName ?? 'Unknown' }))

  const thisMonthHolidays = holidays.filter(h => {
    const d = parseISO(h.date)
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 lg:p-6 space-y-4"
    >
      <div className="flex items-start justify-between">
        <PageHeader title="My Calendar" description="Team schedule and public holidays." />
        <button
          onClick={() => setShowHolidayModal(true)}
          className="rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          + Create Holiday
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            {format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">‹</button>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">›</button>
          </div>
        </div>
        <CalendarGrid
          month={viewMonth}
          year={viewYear}
          publicHolidays={holidays}
          approvedLeaves={approvedLeaves}
          pendingLeaves={pendingLeaves}
        />
        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Public Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Floater Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> On Leave</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Leave Applied</span>
        </div>
      </div>

      {thisMonthHolidays.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
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

      <CreateHolidayModal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)} />
    </motion.div>
  )
}
