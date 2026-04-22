'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { format } from 'date-fns'
import type { Announcement } from '@/types/announcement'

interface HRStats {
  totalActive: number
  onLeaveToday: number
  pendingApprovals: number
  newJoinersThisMonth: number
  leavesThisMonth: number
  availablePercent: number
  monthlyTrend: { month: string; count: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (typeof value !== 'number') return
    const timer = setTimeout(() => {
      const steps = 30; let current = 0; const step = value / steps
      const interval = setInterval(() => {
        current += step
        if (current >= value) { setCount(value); clearInterval(interval) } else setCount(Math.floor(current))
      }, 800 / steps)
      return () => clearInterval(interval)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-3xl font-bold text-slate-900">{typeof value === 'number' ? count : value}</p>
      <p className="text-slate-500 text-xs mt-1">{label}</p>
      <div className={`h-1 rounded-full mt-3 ${color}`} />
    </div>
  )
}

export default function HRDashboardPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: currentUserData } = useCurrentUser()
  const user = currentUserData?.user
  const firstName = getCleanFirstName(user?.firstName, user?.displayName)
  const [announcementForm, setAnnouncementForm] = useState({ open: false, title: '', content: '' })

  const { data: stats, isLoading } = useQuery<HRStats>({
    queryKey: ['hrStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [empRes, leavesRes] = await Promise.all([
        fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hr/leaves', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const employees = await empRes.json()
      const leaves = await leavesRes.json()

      const activeEmployees = Array.isArray(employees)
        ? employees.filter((e: { employmentStatus: string }) => e.employmentStatus === 'ACTIVE') : []
      const onLeaveToday = Array.isArray(employees)
        ? employees.filter((e: { availabilityStatus: string }) => e.availabilityStatus !== 'AVAILABLE').length : 0
      const pendingLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'PENDING').length : 0
      const approvedLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'APPROVED').length : 0
      const rejectedLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'REJECTED').length : 0

      return {
        totalActive: activeEmployees.length,
        onLeaveToday,
        pendingApprovals: pendingLeaves,
        newJoinersThisMonth: 0,
        leavesThisMonth: Array.isArray(leaves) ? leaves.length : 0,
        availablePercent: activeEmployees.length > 0
          ? Math.round(((activeEmployees.length - onLeaveToday) / activeEmployees.length) * 100) : 100,
        monthlyTrend: [
          { month: 'Nov', count: 8 }, { month: 'Dec', count: 12 },
          { month: 'Jan', count: 6 }, { month: 'Feb', count: 10 },
          { month: 'Mar', count: 14 }, { month: 'Apr', count: approvedLeaves },
        ],
        statusDistribution: [
          { name: 'Approved', value: approvedLeaves, color: '#16A34A' },
          { name: 'Pending', value: pendingLeaves, color: '#D97706' },
          { name: 'Rejected', value: rejectedLeaves, color: '#DC2626' },
        ],
      }
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
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setAnnouncementForm({ open: false, title: '', content: '' })
    },
  })

  if (isLoading) return <PageSkeleton />
  if (!stats) return null

  const statItems = [
    { label: 'Total Active Employees', value: stats.totalActive, color: 'bg-blue-500' },
    { label: 'On Leave Today', value: stats.onLeaveToday, color: 'bg-red-500' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, color: 'bg-amber-500' },
    { label: 'Leaves This Month', value: stats.leavesThisMonth, color: 'bg-purple-500' },
    { label: 'New Joiners This Month', value: stats.newJoinersThisMonth, color: 'bg-green-500' },
    { label: 'Available Today', value: `${stats.availablePercent}%`, color: 'bg-teal-500' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 lg:p-6 space-y-4"
    >
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xl font-bold overflow-hidden flex-shrink-0">
              {user?.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.displayName ?? 'HR')
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Welcome back, {firstName} 👋</p>
              <p className="text-sm text-slate-500">{user?.jobTitle ?? 'HR'}</p>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statItems.map((s) => <StatCard key={s.label} {...s} />)}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-slate-900 font-semibold text-sm mb-4">Monthly Leave Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthlyTrend}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-slate-900 font-semibold text-sm mb-4">Leave Status Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={stats.statusDistribution.filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {stats.statusDistribution.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {stats.statusDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-slate-900 font-semibold text-base mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => router.push('/hr/leaves')} className="btn-primary">Review Leave Approvals</button>
          <button onClick={() => router.push('/hr/employees')} className="btn-secondary">Team Monkstack</button>
          <button onClick={() => router.push('/hr/apply-leave')} className="btn-secondary">Apply Leave</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 font-semibold text-base">Announcements</h2>
          <button onClick={() => setAnnouncementForm({ ...announcementForm, open: !announcementForm.open })}
            className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors font-medium">
            {announcementForm.open ? 'Cancel' : '+ Post Announcement'}
          </button>
        </div>

        {announcementForm.open && (
          <div className="mb-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="Announcement title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
            <textarea value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              rows={3} placeholder="Content..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-400" />
            <button onClick={() => postAnnouncement.mutate()} disabled={postAnnouncement.isPending}
              className="rounded-lg bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors">
              {postAnnouncement.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}

        {announcements.length === 0 ? (
          <EmptyState icon="📢" title="No announcements" description="Post an announcement to all employees." />
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
