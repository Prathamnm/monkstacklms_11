'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import type { Announcement } from '@/types/announcement'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'

import toast from 'react-hot-toast'

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
    <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 22px' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: 'var(--color-heading)', lineHeight: 1 }}>{typeof value === 'number' ? count : value}</p>
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content: '' })

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
      toast.success('Announcement posted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateAnnouncement = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setEditingId(null)
      toast.success('Announcement updated')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading) return <PageSkeleton />
  if (!stats) return null

  const statItems = [
    { label: 'Active Employees', value: stats.totalActive, color: 'bg-blue-500' },
    { label: 'Available Today', value: stats.totalActive - stats.onLeaveToday, color: 'bg-green-500' },
    { label: 'On Leave Today', value: stats.onLeaveToday, color: 'bg-red-500' },
    { label: 'Leaves Approved This Month', value: stats.leavesThisMonth, color: 'bg-purple-500' },
  ]

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
                getInitials(user?.displayName ?? 'HR')
              )}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-heading)' }}>Welcome back, {firstName} 👋</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>{user?.jobTitle ?? 'HR'}</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', flexShrink: 0 }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {statItems.map((s) => <StatCard key={s.label} {...s} />)}
      </motion.div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 3 }}>
          <AttendanceCard />
        </div>
        <div style={{ flex: 1 }}>
          <PoliciesSection canUpload={false} />
        </div>
      </div>

      {/* Announcements */}
      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)' }}>Announcements</h2>
          <button onClick={() => setAnnouncementForm({ ...announcementForm, open: !announcementForm.open })}
            style={{ fontSize: 12, color: 'var(--icon-pill-blue-stroke)', background: 'none', border: '0.5px solid var(--color-card-border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>
            {announcementForm.open ? 'Cancel' : '+ Post Announcement'}
          </button>
        </div>

        {announcementForm.open && (
          <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-page-bg)', borderRadius: 10, padding: 14, border: '0.5px solid var(--color-card-border)' }}>
            <input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="Announcement title" style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid var(--color-card-border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--color-heading)', background: 'var(--color-card-bg)', outline: 'none' }} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} style={{ background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '16px' }}>
                {editingId === a.id ? (
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                    <textarea
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
                      rows={3}
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateAnnouncement.mutate({ id: a.id, title: editForm.title, content: editForm.content })}
                        disabled={updateAnnouncement.isPending}
                        className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded-md font-medium"
                      >
                        {updateAnnouncement.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[11px] bg-slate-200 text-slate-600 px-3 py-1 rounded-md font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)' }}>{a.title}</p>
                      <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(a.id)
                              setEditForm({ title: a.title, content: a.content })
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit announcement"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this announcement?')) deleteAnnouncement.mutate(a.id)
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete announcement"
                          >
                            <Trash2 size={14} />
                          </button>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{a.content}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>{a.poster?.displayName}</span>
                      <span>•</span>
                      <span>{format(new Date(a.createdAt), 'dd MMM yyyy')}</span>
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
