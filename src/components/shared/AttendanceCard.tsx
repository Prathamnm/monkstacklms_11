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
  if (holidayName) return { label: 'Holiday', color: '#8B5CF6' } // Purple for holidays
  if (isWeekend) return { label: 'Weekend', color: '#94A3B8' } // Slate for weekends
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
    staleTime: 55 * 1000,
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
    <div
      style={{
        background: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 16,
        padding: '24px 28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--icon-pill-blue-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--icon-pill-blue-stroke)',
            }}
          >
            <Clock size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)', margin: 0 }}>
              Attendance
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
              {avgHours !== null ? `Avg ${avgHours}h / recorded day` : 'No data recorded yet'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-page-bg)', padding: '4px 8px', borderRadius: 20, border: '1px solid var(--color-card-border)' }}>
          <button 
            onClick={handlePrevMonth} 
            disabled={isJoinMonth}
            style={{ 
              background: 'transparent', border: 'none', cursor: isJoinMonth ? 'not-allowed' : 'pointer',
              color: isJoinMonth ? 'var(--color-muted)' : 'var(--color-heading)', display: 'flex', alignItems: 'center'
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)', minWidth: 100, textAlign: 'center' }}>
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth} 
            disabled={isCurrentMonth}
            style={{ 
              background: 'transparent', border: 'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
              color: isCurrentMonth ? 'var(--color-muted)' : 'var(--color-heading)', display: 'flex', alignItems: 'center'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading…</p>
      ) : (
        <div
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            border: '1px solid var(--color-card-border)',
            borderRadius: 12,
            background: 'var(--color-page-bg)',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,0.6fr) minmax(0,1fr)',
              gap: 8,
              alignItems: 'center',
              padding: '10px 16px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              borderBottom: '1px solid var(--color-card-border)',
              background: 'rgba(248, 250, 252, 0.5)',
            }}
          >
            <span>Date</span>
            <span>Punch In/Out</span>
            <span style={{ textAlign: 'center' }}>Hours</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>

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
              st.color = 'var(--color-muted)'
            }

            const getStatusStyles = (label: string) => {
              switch (label) {
                case 'Full day': return { bg: '#F0FDF4', text: '#15803D' }
                case 'Half day': return { bg: '#FFFBEB', text: '#D97706' }
                case 'Holiday': return { bg: '#F5F3FF', text: '#7C3AED' }
                case 'Weekend': return { bg: '#F8FAFC', text: '#64748B' }
                case 'Absent':
                case 'No data': return { bg: '#FEF2F2', text: '#DC2626' }
                default: return { bg: 'transparent', text: 'inherit' }
              }
            }
            const badge = getStatusStyles(st.label)

            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,0.6fr) minmax(0,1fr)',
                  gap: 8,
                  alignItems: 'center',
                  padding: '12px 16px',
                  fontSize: 13,
                  borderBottom: '1px solid var(--color-card-border)',
                  background: isToday ? 'rgba(59, 130, 246, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.3)'),
                }}
              >
                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {format(day, 'EEE, MMM d')}
                  {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: '#3B82F6', color: '#fff', padding: '1px 5px', borderRadius: 4, verticalAlign: 'middle' }}>Today</span>}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                  {rec?.punchIn ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {format(parseISO(rec.punchIn), 'hh:mm a')}
                      <span style={{ margin: '0 4px', opacity: 0.5 }}>→</span>
                      {rec?.punchOut ? format(parseISO(rec.punchOut), 'hh:mm a') : '??'}
                    </span>
                  ) : (
                    <span style={{ opacity: 0.4 }}>—</span>
                  )}
                </span>
                <span style={{ color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: 600 }}>
                  {rec?.hoursWorked != null ? `${rec.hoursWorked}h` : ''}
                </span>
                <div style={{ textAlign: 'right' }}>
                  {st.label !== '—' ? (
                    <span style={{ 
                      display: 'inline-block',
                      background: badge.bg, 
                      color: badge.text, 
                      padding: '2px 8px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {st.label === 'Holiday' ? (holiday?.name || 'Holiday') : st.label}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-muted)', fontSize: 11 }}>—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

