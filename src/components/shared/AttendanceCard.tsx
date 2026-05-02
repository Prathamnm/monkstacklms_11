'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { Clock } from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: string
  punchIn: string | null
  punchOut: string | null
  hoursWorked: number | null
}

function statusFromHours(hours: number | null): { label: string; color: string } {
  if (hours === null) return { label: 'No data', color: '#94A3B8' }
  if (hours >= 6) return { label: 'Full day', color: '#15803D' }
  if (hours >= 3) return { label: 'Half day', color: '#D97706' }
  return { label: 'Absent', color: '#DC2626' }
}

export function AttendanceCard() {
  const { instance } = useMsal()
  const monthRef = useMemo(() => new Date(), [])
  const monthKey = format(monthRef, 'yyyy-MM')

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
  })

  const byDate = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    for (const r of records) {
      m.set(format(parseISO(r.date), 'yyyy-MM-dd'), r)
    }
    return m
  }, [records])

  const monthStart = startOfMonth(monthRef)
  const monthEnd = endOfMonth(monthRef)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const avgHours =
    records.length > 0
      ? Math.round((records.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0) / records.length) * 10) / 10
      : null

  const todayKey = format(new Date(), 'yyyy-MM-dd')

  return (
    <div
      style={{
        background: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 16,
        padding: '24px 28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)', margin: 0 }}>
            Attendance
          </h3>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
            {format(monthRef, 'MMMM yyyy')}
            {avgHours !== null ? ` · Avg ${avgHours}h / recorded day` : ''}
          </p>
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
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const rec = byDate.get(key)
            const st = statusFromHours(rec?.hoursWorked ?? null)
            const isToday = key === todayKey

            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 14px',
                  fontSize: 12,
                  borderBottom: '1px solid var(--color-card-border)',
                  background: isToday ? '#f1f5f9' : undefined,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                  {format(day, 'EEE, MMM d')}
                </span>
                <span style={{ color: 'var(--color-muted)' }}>
                  {rec?.punchIn ? format(parseISO(rec.punchIn), 'hh:mm a') : '—'} →{' '}
                  {rec?.punchOut ? format(parseISO(rec.punchOut), 'hh:mm a') : '—'}
                </span>
                <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>
                  {rec?.hoursWorked != null ? `${rec.hoursWorked}h` : '—'}
                </span>
                <span style={{ fontWeight: 600, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
