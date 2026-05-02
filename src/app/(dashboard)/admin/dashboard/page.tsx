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
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'

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
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}
    >

      {/* Welcome Banner */}
      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 14, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--balance-track-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-heading)', fontSize: 16, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
              {user?.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePictureUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(user?.displayName ?? 'Admin')
              )}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-heading)' }}>Welcome back, {firstName} 👋</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>{user?.jobTitle ?? 'System Administrator'}</p>
              {user && (
                <span className={cn('text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block', ROLE_COLORS[user.role as Role])}>
                  {ROLE_LABELS[user.role as Role]}
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', flexShrink: 0 }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* System Overview — 2 stat cards */}
      <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {[
          { label: 'Active Employees', value: systemStats?.activeEmployees ?? '—' },
          { label: 'Pending Approvals', value: systemStats?.pendingApprovals ?? '—' },
        ].map((s) => (
          <motion.div key={s.label} variants={itemVariants} style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 22px' }}>
            <p style={{ fontSize: 28, fontWeight: 500, color: 'var(--color-heading)', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 6 }}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Audit Log */}
      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-heading)' }}>Recent Audit Events</h2>
          <button onClick={() => router.push('/admin/audit')} style={{ fontSize: 12, color: 'var(--icon-pill-blue-stroke)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View all</button>
        </div>
        {auditLogs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>No audit events yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Actor</th>
                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Action</th>
                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--color-heading)' }}>{log.performer?.displayName ?? log.performedBy}</td>
                    <td style={{ padding: '10px 0', color: 'var(--color-muted)' }}>{log.action}</td>
                    <td style={{ padding: '10px 0', color: 'var(--color-muted)' }}>{format(new Date(log.createdAt), 'dd MMM HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Last Accrual Run */}
      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 22px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 12 }}>Leave Accrual</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            Last run: <span style={{ fontWeight: 500, color: 'var(--color-heading)' }}>
              {lastAccrualRun ? format(new Date(lastAccrualRun), 'dd MMM yyyy HH:mm') : 'Never run'}
            </span>
          </p>
          <button onClick={() => runAccrualMutation.mutate()} disabled={runAccrualMutation.isPending}
            style={{ background: 'var(--icon-pill-blue-stroke)', color: 'var(--icon-pill-blue-bg)', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: runAccrualMutation.isPending ? 0.6 : 1 }}>
            <Play size={14} /> {runAccrualMutation.isPending ? 'Running...' : 'Run Accrual Now'}
          </button>
        </div>
      </div>

      <AttendanceCard />
      <PoliciesSection canUpload={user?.role === 'HR' || user?.role === 'ADMIN'} />

      {/* Announcements (with delete) */}
      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-heading)' }}>Announcements</h2>
          <button onClick={() => setAnnouncementForm({ ...announcementForm, open: !announcementForm.open })}
            style={{ fontSize: 12, color: 'var(--icon-pill-blue-stroke)', background: 'none', border: '0.5px solid var(--color-card-border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>
            {announcementForm.open ? 'Cancel' : '+ Post'}
          </button>
        </div>

        {announcementForm.open && (
          <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-page-bg)', borderRadius: 10, padding: 14, border: '0.5px solid var(--color-card-border)' }}>
            <input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="Title" style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid var(--color-card-border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--color-heading)', background: 'var(--color-card-bg)', outline: 'none' }} />
            <textarea value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              rows={3} placeholder="Content..." style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid var(--color-card-border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--color-heading)', background: 'var(--color-card-bg)', outline: 'none', resize: 'none' }} />
            <button onClick={() => postAnnouncement.mutate()} disabled={postAnnouncement.isPending}
              style={{ background: 'var(--icon-pill-blue-stroke)', color: 'var(--icon-pill-blue-bg)', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: postAnnouncement.isPending ? 0.6 : 1, alignSelf: 'flex-start' }}>
              {postAnnouncement.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}

        {announcements.length === 0 ? (
          <EmptyState icon="📢" title="No announcements" description="Post an announcement to all employees." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)' }}>{a.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{a.content}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6 }}>{a.poster?.displayName} · {format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <button onClick={() => deleteAnnouncement.mutate(a.id)} title="Delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
