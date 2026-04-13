'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Users, CalendarX, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { Announcement } from '@/types/announcement'

interface ManagerStats {
  pendingApprovals: number
  teamSize: number
  onLeaveToday: number
  leavesThisMonth: number
}

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const duration = 800; const steps = 30; const stepValue = value / steps; let current = 0
    const timer = setInterval(() => {
      current += stepValue
      if (current >= value) { setCount(value); clearInterval(timer) } else { setCount(Math.floor(current)) }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <span>{count}</span>
}

const containerVariants = { animate: { transition: { staggerChildren: 0.07 } } }
const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export default function ManagerDashboardPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: userData } = useCurrentUser()

  const [announcementForm, setAnnouncementForm] = useState({ open: false, title: '', content: '' })

  const { data: stats, isLoading } = useQuery<ManagerStats>({
    queryKey: ['managerStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const [approvalsRes, employeesRes, approvedMonthRes] = await Promise.all([
        fetch('/api/manager/approvals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/manager/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(
          `/api/manager/approvals/history?status=APPROVED&from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ])
      const approvals = await approvalsRes.json()
      const employees = await employeesRes.json()
      const approvedMonth = approvedMonthRes.ok ? await approvedMonthRes.json() : []
      const onLeaveToday = (employees as Array<{ availabilityStatus: string }>)
        .filter((e) => e.availabilityStatus !== 'AVAILABLE').length
      return {
        pendingApprovals: Array.isArray(approvals) ? approvals.length : 0,
        teamSize: Array.isArray(employees) ? employees.length : 0,
        onLeaveToday,
        leavesThisMonth: Array.isArray(approvedMonth) ? approvedMonth.length : 0,
      }
    },
  })

  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ['managerPendingLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/approvals', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      const all = await res.json()
      return all.slice(0, 3)
    },
  })

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const postAnnouncement = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: announcementForm.title, content: announcementForm.content }),
      })
      if (!res.ok) throw new Error('Failed to post announcement')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setAnnouncementForm({ open: false, title: '', content: '' })
    },
  })

  const approveLeaveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/approvals/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Action failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStats'] })
      queryClient.invalidateQueries({ queryKey: ['managerPendingLeaves'] })
    },
  })

  if (isLoading) return <PageSkeleton />

  const user = userData?.user
  const balance = userData?.balance
  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  const statCards = [
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: <CheckSquare size={20} />, color: 'bg-amber-50 text-amber-600', href: '/manager/approvals' },
    { label: 'Team Size', value: stats?.teamSize ?? 0, icon: <Users size={20} />, color: 'bg-blue-50 text-blue-600', href: '/manager/employees' },
    { label: 'On Leave Today', value: stats?.onLeaveToday ?? 0, icon: <CalendarX size={20} />, color: 'bg-red-50 text-red-600' },
    { label: 'Leaves Approved This Month', value: stats?.leavesThisMonth ?? 0, icon: <Calendar size={20} />, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8 space-y-6">

      {/* Welcome */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xl font-bold overflow-hidden flex-shrink-0">
              {user?.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.displayName ?? 'Manager')
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Welcome back, {firstName} 👋</p>
              <p className="text-sm text-slate-500">{user?.designation ?? user?.jobTitle ?? 'Manager'}</p>
              {user && (
                <span className={cn('text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block', ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role]}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-400 flex-shrink-0">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={containerVariants} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}
            onClick={() => stat.href && router.push(stat.href)}
            className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 ${stat.href ? 'cursor-pointer' : ''}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>{stat.icon}</div>
            <p className="text-3xl font-bold text-slate-900"><AnimatedCounter value={stat.value} /></p>
            <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Leave balance mini-card */}
      {balance && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Leave Balance</p>
          <div className="flex gap-8">
            <div><p className="text-2xl font-semibold text-slate-900">{balance.availableStandard}</p><p className="text-xs text-slate-500 mt-1">Standard remaining</p></div>
            <div><p className="text-2xl font-semibold text-slate-900">{balance.availableEmergency}</p><p className="text-xs text-slate-500 mt-1">Emergency remaining</p></div>
          </div>
        </div>
      )}

      {/* Pending approvals quick view */}
      {pendingLeaves.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Pending Approvals</h2>
            <button onClick={() => router.push('/manager/approvals')} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {pendingLeaves.map((leave: any) => (
              <div key={leave.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{leave.employee?.displayName ?? 'Employee'}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(leave.startDate), 'dd MMM')} → {format(new Date(leave.endDate), 'dd MMM')} · {leave.totalDays}d
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => approveLeaveMutation.mutate({ id: leave.id, action: 'approve' })}
                    className="w-8 h-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm flex items-center justify-center font-bold transition-colors">✓</button>
                  <button onClick={() => approveLeaveMutation.mutate({ id: leave.id, action: 'reject' })}
                    className="w-8 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm flex items-center justify-center font-bold transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-slate-900 font-semibold text-base mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => router.push('/manager/approvals')} className="btn-primary flex items-center gap-2">
            <CheckSquare size={16} /> Review Approvals
            {(stats?.pendingApprovals ?? 0) > 0 && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{stats?.pendingApprovals}</span>}
          </button>
          <button onClick={() => router.push('/manager/projects')} className="btn-secondary flex items-center gap-2">View Projects</button>
          <button onClick={() => router.push('/manager/employees')} className="btn-secondary flex items-center gap-2">My Team</button>
          <button onClick={() => router.push('/manager/apply-leave')} className="btn-secondary flex items-center gap-2">Apply Leave</button>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 font-semibold text-base">Announcements</h2>
          <button onClick={() => setAnnouncementForm({ ...announcementForm, open: !announcementForm.open })}
            className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium">
            {announcementForm.open ? 'Cancel' : '+ Post Announcement'}
          </button>
        </div>

        {announcementForm.open && (
          <div className="mb-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="Announcement title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <textarea value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              rows={3} placeholder="Announcement content..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <button onClick={() => postAnnouncement.mutate()} disabled={postAnnouncement.isPending}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {postAnnouncement.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}

        {announcements.length === 0 ? (
          <EmptyState icon="📢" title="No announcements" description="Post an announcement to notify the team." />
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-slate-400 mt-2">{a.poster?.displayName} · {format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
