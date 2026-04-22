'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Users, ScrollText, Play } from 'lucide-react'
import { format } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { useState } from 'react'
import type { Announcement } from '@/types/announcement'
import type { Role } from '@/types/auth'

const containerVariants = { animate: { transition: { staggerChildren: 0.07 } } }
const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const { data: userData } = useCurrentUser()
  const [announcementForm, setAnnouncementForm] = useState({ open: false, title: '', content: '' })

  const { data: systemStats } = useQuery({
    queryKey: ['adminSystemStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [usersRes, approvalsRes] = await Promise.all([
        fetch('/api/admin/users?status=ACTIVE', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/manager/approvals', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const users = usersRes.ok ? await usersRes.json() : []
      const approvals = approvalsRes.ok ? await approvalsRes.json() : []
      return {
        activeEmployees: Array.isArray(users) ? users.length : 0,
        pendingApprovals: Array.isArray(approvals) ? approvals.length : 0,
      }
    },
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/audit?limit=10', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: lastAccrualRun } = useQuery<string>({
    queryKey: ['lastAccrualRun'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return ''
      const settings = await res.json()
      const entry = settings.find?.((s: { key: string; value: string }) => s.key === 'LAST_ACCRUAL_RUN')
      return entry?.value ?? ''
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

  const runAccrualMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/accrual/run', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Accrual run failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lastAccrualRun'] }),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setAnnouncementForm({ open: false, title: '', content: '' }) },
  })

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      await fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const user = userData?.user
  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="p-4 lg:p-6 space-y-4">

      {/* Welcome Card — Task 2a */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xl font-bold overflow-hidden flex-shrink-0">
            {user?.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              getInitials(user?.displayName ?? 'Admin')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-slate-900">Welcome back, {firstName} 👋</p>
            <p className="text-sm text-slate-500">{user?.jobTitle ?? 'System Administrator'}</p>
            {user && (
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block', ROLE_COLORS[user.role as Role])}>
                {ROLE_LABELS[user.role as Role]}
              </span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* System Overview stats — Task 2b: only 2 cards */}
      <motion.div variants={containerVariants} initial="initial" animate="animate" className="grid grid-cols-2 gap-4">
        {[
          { label: 'Active Employees', value: systemStats?.activeEmployees ?? '—' },
          { label: 'Pending Approvals', value: systemStats?.pendingApprovals ?? '—' },
        ].map((s) => (
          <motion.div key={s.label} variants={itemVariants} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-slate-500 text-xs mt-1">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions removed — Task 2c */}

      {/* Recent Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 font-semibold text-sm">Recent Audit Events</h2>
          <button onClick={() => router.push('/admin/audit')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No audit events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-2 font-medium">Actor</th>
                <th className="text-left py-2 font-medium">Action</th>
                <th className="text-left py-2 font-medium">Time</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="py-2 text-slate-700">{log.performer?.displayName ?? log.performedBy}</td>
                    <td className="py-2 text-slate-600">{log.action}</td>
                    <td className="py-2 text-slate-400">{format(new Date(log.createdAt), 'dd MMM HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Last Accrual Run */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-slate-900 font-semibold text-sm mb-3">Leave Accrual</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Last run: <span className="font-medium text-slate-900">
              {lastAccrualRun ? format(new Date(lastAccrualRun), 'dd MMM yyyy HH:mm') : 'Never run'}
            </span>
          </p>
          <button onClick={() => runAccrualMutation.mutate()} disabled={runAccrualMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
            <Play size={14} /> {runAccrualMutation.isPending ? 'Running...' : 'Run Accrual Now'}
          </button>
        </div>
      </div>

      {/* Announcements (with delete) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 font-semibold text-sm">Announcements</h2>
          <button onClick={() => setAnnouncementForm({ ...announcementForm, open: !announcementForm.open })}
            className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium">
            {announcementForm.open ? 'Cancel' : '+ Post'}
          </button>
        </div>

        {announcementForm.open && (
          <div className="mb-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="Title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <textarea value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              rows={3} placeholder="Content..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <button onClick={() => postAnnouncement.mutate()} disabled={postAnnouncement.isPending}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {postAnnouncement.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}

        {announcements.length === 0 ? (
          <EmptyState icon="📢" title="No announcements" description="Post an announcement to all employees." />
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.poster?.displayName} · {format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <button onClick={() => deleteAnnouncement.mutate(a.id)} title="Delete"
                  className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
