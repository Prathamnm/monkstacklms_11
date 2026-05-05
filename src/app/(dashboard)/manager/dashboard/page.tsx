'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Calendar,
  CalendarX,
  CheckSquare,
  Users,
  Pencil,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLeaveBalance } from '@/hooks/useLeaveBalance'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import type { Announcement } from '@/types/announcement'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'

const containerVariants = { animate: { transition: { staggerChildren: 0.07 } } }
const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

type Audience = 'all' | 'managers' | 'employees'
type PendingLeavePreview = {
  id: string
  startDate: string
  endDate: string
  totalDays: number
  employee?: { displayName?: string | null } | null
}

function StatCard(props: {
  label: string
  icon: React.ReactNode
  href: string
  value: number | null
  isLoading: boolean
  isError: boolean
  showIndicator?: boolean
  tooltip?: string | null
  onRetry?: () => void
  pillBgVar: string
  pillStrokeVar: string
}) {
  const router = useRouter()
  return (
    <motion.button
      variants={itemVariants}
      onClick={() => router.push(props.href)}
      type="button"
      className="rounded-xl text-left transition-shadow relative"
      style={{
        background: 'var(--color-card-bg)',
        border: '0.5px solid var(--color-card-border)',
        borderRadius: '12px',
        padding: '14px 16px',
      }}
      title={props.tooltip ?? undefined}
    >
      {props.isLoading ? (
        <div>
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `var(${props.pillBgVar})`,
              color: `var(${props.pillStrokeVar})`,
            }}
            aria-hidden="true"
          >
            {props.icon}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight mb-1" style={{ color: 'var(--color-heading)' }}>
              {props.label}
            </p>
            <p className="text-lg font-bold leading-none opacity-80" style={{ color: 'var(--color-heading)' }}>
              {props.isError ? '\u2014' : props.value ?? '\u2014'}
            </p>
          </div>

          {props.isError && props.onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                props.onRetry?.()
              }}
              className="text-xs text-blue-600 hover:underline mt-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {props.showIndicator && !props.isLoading && !props.isError && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500" aria-label="Needs attention" />
      )}
    </motion.button>
  )
}

export default function ManagerDashboardPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: userData } = useCurrentUser()
  const { data: leaveBalance } = useLeaveBalance()

  const user = userData?.user
  const userId = user?.id

  // Role guard
  useEffect(() => {
    if (!user) return
    if (user.role !== 'MANAGER') {
      router.replace(user.role === 'HR' ? '/hr/dashboard' : '/employee/dashboard')
    }
  }, [router, user])

  const now = useMemo(() => new Date(), [])
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const todayLabel = format(new Date(), 'EEEE, MMM d')

  const [announcementForm, setAnnouncementForm] = useState({
    open: false,
    title: '',
    body: '',
    audience: 'all' as Audience,
  })

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
    error: profileErrObj,
  } = useQuery<{
    name: string
    designation: string
    role: string
    avatarInitials: string
    avatarColor: string
  }>({
    queryKey: ['userProfile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token || !userId) throw new Error('UNAUTHORIZED')
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const {
    data: pendingCount,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
    error: pendingErrObj,
  } = useQuery<{ count: number }>({
    queryKey: ['pendingApprovalsCount', userId],
    enabled: !!userId,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token || !userId) throw new Error('UNAUTHORIZED')
      const res = await fetch(`/api/leaves/pending?managerId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  })

  const {
    data: teamSize,
    isLoading: teamSizeLoading,
    isError: teamSizeError,
    refetch: refetchTeamSize,
    error: teamSizeErrObj,
  } = useQuery<{ count: number }>({
    queryKey: ['teamSize', userId],
    enabled: !!userId,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token || !userId) throw new Error('UNAUTHORIZED')
      const res = await fetch(`/api/teams/${encodeURIComponent(userId)}/members?status=active`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const {
    data: onLeaveToday,
    isLoading: onLeaveLoading,
    isError: onLeaveError,
    refetch: refetchOnLeave,
    error: onLeaveErrObj,
  } = useQuery<{ count: number; members: Array<{ name: string; avatarInitials: string }> }>({
    queryKey: ['onLeaveToday', userId],
    enabled: !!userId,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token || !userId) throw new Error('UNAUTHORIZED')
      const res = await fetch(`/api/leaves/active-today?teamId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  })

  const {
    data: approvedThisMonth,
    isLoading: approvedLoading,
    isError: approvedError,
    refetch: refetchApproved,
    error: approvedErrObj,
  } = useQuery<{ count: number }>({
    queryKey: ['approvedThisMonth', userId, currentMonth, currentYear],
    enabled: !!userId,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token || !userId) throw new Error('UNAUTHORIZED')
      const res = await fetch(
        `/api/leaves/approved?teamId=${encodeURIComponent(userId)}&month=${currentMonth}&year=${currentYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }
      )
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  useEffect(() => {
    const errors = [profileErrObj, pendingErrObj, teamSizeErrObj, onLeaveErrObj, approvedErrObj]
    if (errors.some((e) => e instanceof Error && e.message === 'UNAUTHORIZED')) {
      router.replace('/login')
    }
  }, [approvedErrObj, onLeaveErrObj, pendingErrObj, profileErrObj, router, teamSizeErrObj])

  const { data: pendingLeaves = [], isLoading: pendingPreviewLoading } = useQuery<PendingLeavePreview[]>({
    queryKey: ['managerPendingLeavesPreview', userId],
    enabled: !!userId,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('UNAUTHORIZED')
      const res = await fetch('/api/manager/approvals', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      const all = await res.json()
      return all.slice(0, 3)
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  })

  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    isError: announcementsError,
    refetch: refetchAnnouncements,
  } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('UNAUTHORIZED')
      const res = await fetch('/api/announcements?limit=5', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) throw new Error('UNAUTHORIZED')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', body: '' })

  const postAnnouncement = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('UNAUTHORIZED')
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementForm.title,
          content: announcementForm.body,
          audience: announcementForm.audience,
          createdBy: userId,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error ?? 'Failed to post announcement')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setAnnouncementForm({ open: false, title: '', body: '', audience: 'all' })
      toast.success('Announcement posted')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
  })

  const approveLeaveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('UNAUTHORIZED')
      const res = await fetch(`/api/manager/approvals/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Action failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] })
      queryClient.invalidateQueries({ queryKey: ['managerPendingLeavesPreview'] })
      queryClient.invalidateQueries({ queryKey: ['approvedThisMonth'] })
      queryClient.invalidateQueries({ queryKey: ['onLeaveToday'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const firstName = getCleanFirstName(user?.firstName, user?.displayName)
  const welcomeName = profile?.name?.split(' ')[0] ?? firstName

  const onLeaveNames = onLeaveToday?.members?.map((m) => m.name).join(', ') ?? null

  const standardAvailable = leaveBalance
    ? Math.max(0, leaveBalance.standardTotal - leaveBalance.standardUsed - leaveBalance.pendingDays)
    : null
  const usedPercent = leaveBalance?.standardTotal
    ? Math.min(100, (leaveBalance.standardUsed / leaveBalance.standardTotal) * 100)
    : 0

  const lowBalance = standardAvailable !== null && standardAvailable <= 1

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{ padding: '24px', background: 'var(--color-page-bg)', minHeight: '100vh' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Banner (Full Width) */}
        <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-background-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-info)', fontSize: 14, fontWeight: 500, overflow: 'hidden', flexShrink: 0 }}>
                {user?.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePictureUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(user?.displayName ?? 'Manager')
                )}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>Welcome back, {welcomeName} 👋</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{profile?.designation ?? user?.jobTitle ?? 'Manager'}</p>
              </div>
            </div>
            <div style={{ background: 'var(--color-background-secondary)', padding: '6px 12px', borderRadius: '99px', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400, flexShrink: 0 }}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="stat-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}
        >
          <StatCard
            label="Team size"
            icon={<Users size={16} />}
            href="/manager/employees"
            value={teamSize?.count ?? null}
            isLoading={teamSizeLoading}
            isError={teamSizeError}
            onRetry={() => refetchTeamSize()}
            pillBgVar="--icon-pill-blue-bg"
            pillStrokeVar="--icon-pill-blue-stroke"
          />
          <StatCard
            label="On leave today"
            icon={<CalendarX size={16} />}
            href="/manager/employees?filter=on-leave-today"
            value={onLeaveToday?.count ?? null}
            isLoading={onLeaveLoading}
            isError={onLeaveError}
            tooltip={onLeaveNames}
            onRetry={() => refetchOnLeave()}
            pillBgVar="--icon-pill-red-bg"
            pillStrokeVar="--icon-pill-red-stroke"
          />
          <StatCard
            label="Pending approvals"
            icon={<CheckSquare size={16} />}
            href="/manager/approvals"
            value={pendingCount?.count ?? null}
            isLoading={pendingLoading}
            isError={pendingError}
            showIndicator={(pendingCount?.count ?? 0) > 0}
            onRetry={() => refetchPending()}
            pillBgVar="--icon-pill-amber-bg"
            pillStrokeVar="--icon-pill-amber-stroke"
          />
          <StatCard
            label="Approved this month"
            icon={<Calendar size={16} />}
            href="/manager/approvals?filter=approved"
            value={approvedThisMonth?.count ?? null}
            isLoading={approvedLoading}
            isError={approvedError}
            onRetry={() => refetchApproved()}
            pillBgVar="--icon-pill-green-bg"
            pillStrokeVar="--icon-pill-green-stroke"
          />
        </motion.div>

        {/* Main Content Grid — 6 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '24px' }}>
          {/* Attendance */}
          <div style={{ gridColumn: 'span 4', width: '100%' }}>
            <AttendanceCard />
          </div>

          {/* Company Policies */}
          <div style={{ gridColumn: 'span 2', width: '100%', display: 'flex' }}>
            <PoliciesSection canUpload={false} />
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>Announcements</p>
          <button
            onClick={() => setAnnouncementForm((s) => ({ ...s, open: !s.open }))}
            className="hover:underline"
            style={{ fontSize: 11, color: 'var(--color-text-info)', fontWeight: 500 }}
            type="button"
          >
            {announcementForm.open ? 'Cancel' : '+ Post announcement'}
          </button>
        </div>

        {announcementForm.open && (
          <div className="mb-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner">
            <input
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Announcement title"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <textarea
              value={announcementForm.body}
              onChange={(e) => setAnnouncementForm((s) => ({ ...s, body: e.target.value }))}
              rows={3}
              placeholder="Announcement body..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <select
              value={announcementForm.audience}
              onChange={(e) => setAnnouncementForm((s) => ({ ...s, audience: e.target.value as Audience }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              aria-label="Audience"
            >
              <option value="all">All</option>
              <option value="managers">Managers only</option>
              <option value="employees">Employees only</option>
            </select>
            <button
              onClick={() => postAnnouncement.mutate()}
              disabled={postAnnouncement.isPending}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              type="button"
            >
              {postAnnouncement.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}

        {announcementsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : announcementsError ? (
          <div className="text-sm text-slate-600">
            Could not load ·{' '}
            <button type="button" onClick={() => refetchAnnouncements()} className="text-blue-600 hover:underline">
              Retry
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState icon="📢" title="No announcements" description="Post an announcement to notify the team." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} style={{ background: 'var(--color-background-secondary)', borderRadius: '12px', padding: 16, border: '0.5px solid var(--color-border-tertiary)' }}>
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
                      value={editForm.body}
                      onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateAnnouncement.mutate({ id: a.id, title: editForm.title, content: editForm.body })}
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
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{a.title}</p>
                      <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(a.id)
                              setEditForm({ title: a.title, body: a.content })
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
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{a.content}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
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
