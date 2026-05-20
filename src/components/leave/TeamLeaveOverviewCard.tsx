'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { CalendarDays, Users, Activity } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamLeaveOverview } from '@/hooks/useTeamLeaveOverview'
import type { TeamLeaveOverviewRecord } from '@/types/teamLeaveOverview'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

function isCurrentLeave(rec: TeamLeaveOverviewRecord, now: Date) {
  const start = parseISO(rec.startDate)
  const end = parseISO(rec.endDate)
  return isWithinInterval(now, { start, end })
}

function badgeStyles(leaveType: TeamLeaveOverviewRecord['leaveType'], status: TeamLeaveOverviewRecord['status']) {
  if (status === 'PENDING') {
    return 'bg-slate-100 text-slate-500 border-slate-200'
  }

  switch (leaveType) {
    case 'ANNUAL':
      return 'bg-slate-50 text-slate-700 border-slate-200'
    case 'SICK':
      return 'bg-red-50 text-red-700 border-red-100'
    case 'FLOATER':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    case 'EMERGENCY':
      return 'bg-amber-50 text-amber-700 border-amber-100'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100'
  }
}

function leaveTypeLabel(t: TeamLeaveOverviewRecord['leaveType']) {
  switch (t) {
    case 'ANNUAL': return 'Annual'
    case 'SICK': return 'Sick'
    case 'FLOATER': return 'Floater'
    case 'EMERGENCY': return 'Emergency'
    default: return 'Leave'
  }
}

export function TeamLeaveOverviewCard(props: {
  from: Date
  to: Date
  calendarHref?: string
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
    if (role !== 'HR') return []
    const unique = new Map<string, string>()
    for (const rec of records) {
      const key = (rec.department ?? '').trim()
      if (!key) continue
      unique.set(key, key)
    }
    return Array.from(unique.keys()).sort((a, b) => a.localeCompare(b))
  }, [records, role])

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className={HEADING_STYLES.cardHeader + " mb-1 flex items-center gap-2"}>
            <Activity size={14} className="text-slate-500 shrink-0" />
            <span className="truncate">Teammates on Leave</span>
          </h3>
          <p className="text-[13px] font-medium text-slate-500 leading-none">
            {format(props.from, 'MMMM yyyy')}
          </p>
        </div>

        {role === 'HR' && departmentOptions.length > 0 && (
          <select
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all min-w-[120px]"
            value={department ?? ''}
            onChange={(e) => setDepartment(e.target.value || null)}
          >
            <option value="">All Teams</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-slate-100 border-t-slate-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Checking records...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest">Failed to load overview</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
              <Users size={20} />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] mx-auto">
              {variant === 'embedded' ? 'No teammates on leave this month' : 'No teammates on leave in this period'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((rec) => {
              const isPending = rec.status === 'PENDING'
              return (
                <div
                  key={`${rec.employeeId}:${rec.startDate}:${rec.endDate}`}
                  className={cn(
                    "group flex flex-col gap-3 rounded-2xl border p-4 transition-all",
                    isPending ? "bg-slate-50/50 border-slate-100" : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 shadow-sm flex items-center justify-center text-white text-[12px] font-black shrink-0">
                      {rec.avatarInitials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">
                          {rec.name}
                        </p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border shrink-0",
                          badgeStyles(rec.leaveType, rec.status)
                        )}>
                          {isPending ? 'Pending' : leaveTypeLabel(rec.leaveType)}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-1">
                        {rec.designation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                    <CalendarDays size={12} className="text-slate-500" />
                    <p className="text-[11px] font-bold text-slate-600">
                      {format(parseISO(rec.startDate), 'dd MMM')} — {format(parseISO(rec.endDate), 'dd MMM, yyyy')}
                    </p>
                  </div>
                </div>
              )
            })}

            {!expanded && remaining > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full mt-2 py-2 text-[10px] font-bold text-slate-600 hover:text-slate-800 uppercase tracking-[0.2em] bg-slate-50 rounded-xl border border-slate-200 transition-all active:scale-[0.99]"
              >
                + Show {remaining} more teammates
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (variant === 'embedded') return content

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      {content}
    </motion.div>
  )
}
