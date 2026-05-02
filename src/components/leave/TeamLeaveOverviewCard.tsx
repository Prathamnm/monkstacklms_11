'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { CalendarDays, ChevronRight, Users } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamLeaveOverview } from '@/hooks/useTeamLeaveOverview'
import type { TeamLeaveOverviewRecord } from '@/types/teamLeaveOverview'

function formatRangeLabel(from: Date, to: Date) {
  return `${format(from, 'MMM d')} \u2013 ${format(to, 'MMM d')}`
}

function isCurrentLeave(rec: TeamLeaveOverviewRecord, now: Date) {
  const start = parseISO(rec.startDate)
  const end = parseISO(rec.endDate)
  return isWithinInterval(now, { start, end })
}

function badgeStyles(leaveType: TeamLeaveOverviewRecord['leaveType'], status: TeamLeaveOverviewRecord['status']) {
  if (status === 'pending') {
    return 'bg-slate-100 text-slate-600 border border-slate-200'
  }

  switch (leaveType) {
    case 'annual':
      return 'bg-blue-50 text-blue-700 border border-blue-100'
    case 'sick':
      return 'bg-red-50 text-red-700 border border-red-100'
    case 'floater':
      return 'bg-green-50 text-green-700 border border-green-100'
    case 'emergency':
      return 'bg-amber-50 text-amber-800 border border-amber-100'
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200'
  }
}

function avatarClasses(color: string) {
  switch (color) {
    case 'blue':
      return 'bg-blue-100 text-blue-700'
    case 'green':
      return 'bg-green-100 text-green-700'
    case 'amber':
      return 'bg-amber-100 text-amber-800'
    case 'red':
      return 'bg-red-100 text-red-700'
    case 'purple':
      return 'bg-purple-100 text-purple-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function leaveTypeLabel(t: TeamLeaveOverviewRecord['leaveType']) {
  switch (t) {
    case 'annual':
      return 'Annual'
    case 'sick':
      return 'Sick'
    case 'floater':
      return 'Floater'
    case 'emergency':
      return 'Emergency'
    default:
      return 'Leave'
  }
}

export function TeamLeaveOverviewCard(props: {
  from: Date
  to: Date
  calendarHref: string
  variant?: 'card' | 'embedded'
}) {
  const { data: currentUser } = useCurrentUser()
  const [expanded, setExpanded] = useState(false)
  const [department, setDepartment] = useState<string | null>(null)

  const role = currentUser?.user.role ?? 'EMPLOYEE'
  const variant = props.variant ?? 'card'

  const { data: records = [], isLoading, error } = useTeamLeaveOverview({
    from: props.from,
    to: props.to,
    scope: role,
    department,
  })

  const sorted = useMemo(() => {
    const now = new Date()
    const copy = [...records]
    copy.sort((a, b) => {
      const aCurrent = isCurrentLeave(a, now) ? 1 : 0
      const bCurrent = isCurrentLeave(b, now) ? 1 : 0
      if (aCurrent !== bCurrent) return bCurrent - aCurrent
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
      return a.name.localeCompare(b.name)
    })
    return copy
  }, [records])

  const visible = expanded ? sorted : sorted.slice(0, 5)
  const remaining = Math.max(0, sorted.length - visible.length)

  const departmentOptions = useMemo(() => {
    if (role !== 'HR' && role !== 'ADMIN') return []
    const unique = new Map<string, string>()
    for (const rec of records) {
      const key = (rec.department ?? '').trim()
      if (!key) continue
      unique.set(key, key)
    }
    return Array.from(unique.keys()).sort((a, b) => a.localeCompare(b))
  }, [records, role])

  const content = (
    <div aria-label="Team on Leave overview">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            className={[
              'font-semibold',
              variant === 'embedded' ? 'text-slate-700 text-sm' : 'text-slate-900 text-base',
            ].join(' ')}
          >
            Team on Leave
          </h3>
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
            <CalendarDays size={12} className="text-slate-400" />
            {format(props.from, 'MMMM yyyy')}
            {variant === 'card' ? (
              <>
                <span className="text-slate-300">\u00b7</span>
                {formatRangeLabel(props.from, props.to)}
              </>
            ) : null}
          </p>
        </div>

        {(role === 'HR' || role === 'ADMIN') && departmentOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="team-overview-dept">
              Department filter
            </label>
            <select
              id="team-overview-dept"
              className="input !h-9 !py-1.5 !px-3 text-xs"
              value={department ?? ''}
              onChange={(e) => setDepartment(e.target.value || null)}
            >
              <option value="">All departments</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading team leave\u2026</div>
        ) : error ? (
          <div className="text-sm text-slate-600">Unable to load team leave overview.</div>
        ) : visible.length === 0 ? (
          <div className="border border-slate-100 rounded-lg p-4 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
              <Users size={18} className="text-slate-400" />
            </div>
            <p className="text-slate-700 text-sm font-medium mt-3">
              {variant === 'embedded'
                ? 'No teammates on leave this month'
                : 'No teammates on leave this window'}
            </p>
            <p className="text-slate-500 text-xs mt-1">Try changing the month on the calendar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((rec) => {
              const muted = rec.status === 'pending'
              return (
                <div
                  key={`${rec.employeeId}:${rec.startDate}:${rec.endDate}`}
                  className={[
                    'flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2',
                    muted ? 'bg-slate-50/60' : 'bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={[
                        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                        avatarClasses(rec.avatarColor),
                        muted ? 'opacity-75' : '',
                      ].join(' ')}
                      aria-label={`Avatar for ${rec.name}`}
                    >
                      {rec.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <p className={['text-sm font-medium truncate', muted ? 'text-slate-700' : 'text-slate-900'].join(' ')}>
                        {rec.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{rec.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className={['text-xs font-medium', muted ? 'text-slate-600' : 'text-slate-800'].join(' ')}>
                        {format(parseISO(rec.startDate), 'MMM d')} \u2013 {format(parseISO(rec.endDate), 'MMM d')}
                      </p>
                      <p className="text-[11px] text-slate-500">{rec.status === 'pending' ? 'Pending approval' : 'Approved'}</p>
                    </div>

                    <span
                      className={[
                        'text-[11px] px-2 py-1 rounded-full font-medium whitespace-nowrap',
                        badgeStyles(rec.leaveType, rec.status),
                      ].join(' ')}
                      aria-label={rec.status === 'pending' ? 'Pending leave' : `${leaveTypeLabel(rec.leaveType)} leave`}
                    >
                      {rec.status === 'pending' ? 'Pending' : leaveTypeLabel(rec.leaveType)}
                    </span>
                  </div>
                </div>
              )
            })}

            {!expanded && remaining > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-sm text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View {remaining} more <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className={['mt-4', variant === 'card' ? 'pt-3 border-t border-slate-100' : ''].join(' ')}>
        <Link
          href={props.calendarHref}
          className="text-sm text-blue-700 hover:text-blue-800 font-medium inline-flex items-center gap-1"
        >
          View full team calendar <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )

  if (variant === 'embedded') return content

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl border border-slate-200 p-6"
    >
      {content}
    </motion.div>
  )
}
