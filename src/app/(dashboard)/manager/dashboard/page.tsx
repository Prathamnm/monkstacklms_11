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
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLeaveBalance } from '@/hooks/useLeaveBalance'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ROLE_LABELS } from '@/constants/roles'
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
        <div>
          <div
            className="flex items-center justify-center mb-2.5"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `var(${props.pillBgVar})`,
              color: `var(${props.pillStrokeVar})`,
            }}
            aria-hidden="true"
          >
            {props.icon}
          </div>

          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>
              {props.label}
            </p>
            <p className="text-3xl font-bold leading-none" style={{ color: 'var(--color-heading)' }}>
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
              Could not load · Retry
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
      router.replace(user.role === 'HR' || user.role === 'ADMIN' ? '/hr/dashboard' : '/employee/dashboard')
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
    queryKey: ['announcements', 'manager'],
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

  const postAnnouncement = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('UNAUTHORIZED')
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementForm.title,
          body: announcementForm.body,
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
    onSuccess: (created: Announcement) => {
      queryClient.setQueryData<Announcement[]>(['announcements', 'manager'], (old) => {
        const prev = Array.isArray(old) ? old : []
        return [created, ...prev].slice(0, 5)
      })
      setAnnouncementForm({ open: false, title: '', body: '', audience: 'all' })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
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
      className="min-h-[calc(100vh-64px)]"
      style={{ background: 'var(--color-page-bg)', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {/* Welcome */}
      <div
        className="mb-[14px]"
        style={{
          background: 'var(--color-sidebar-bg)',
          borderRadius: 14,
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--accent-border-blue)',
              color: 'var(--icon-pill-blue-bg)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              fontSize: 14,
              fontWeight: 500,
            }}
            aria-label="User avatar"
          >
            {profileLoading ? (
              <Skeleton className="w-11 h-11 rounded-full" />
            ) : (
              profile?.avatarInitials ?? getInitials(user?.displayName ?? 'Manager')
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-white)' }}>
              {welcomeName}
            </p>
            <p className="truncate" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {profile?.designation ?? user?.jobTitle ?? 'Manager'}
            </p>
            {profileError && (
              <button
                type="button"
                onClick={() => refetchProfile()}
                className="text-xs underline"
                style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}
              >
                Retry
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{todayLabel}</span>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="stat-grid"
      >
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

      {/* Balance + Actions */}
      <div className="balance-actions-row">
        {/* LEFT COLUMN — Company Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <PoliciesSection canUpload={false} />
        </div>

        {/* RIGHT COLUMN — Attendance on top, Leave Balance below */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <AttendanceCard />

          {/* Leave Balance */}
          <div
            className="cursor-pointer"
            onClick={() => router.push('/manager/my-leaves')}
            role="button"
            tabIndex={0}
            style={{
              background: 'var(--color-card-bg)',
              border: '0.5px solid var(--color-card-border)',
              borderLeft: '3px solid var(--accent-border-green)',
              borderRadius: '0 12px 12px 0',
              padding: '16px 18px',
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{
                color: 'var(--icon-pill-green-stroke)',
                marginBottom: 12,
              }}
            >
              Leave balance
            </p>

            {!leaveBalance ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="col-span-3">
                  <Skeleton className="h-1 w-full rounded" />
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>Available</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--color-heading)', lineHeight: 1 }}>
                      {(standardAvailable ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>Used</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--balance-used-color)', lineHeight: 1 }}>
                      {leaveBalance.standardUsed.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginBottom: 4 }}>Pending</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--icon-pill-blue-stroke)', lineHeight: 1 }}>
                      {leaveBalance.pendingDays.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div style={{ background: 'var(--balance-track-bg)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--accent-border-green)', height: 4, width: `${usedPercent}%` }} />
                  </div>
                </div>

                {lowBalance && (
                  <p className="mt-2 flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--icon-pill-amber-stroke)' }}>
                    <AlertTriangle size={12} />
                    Low balance — plan ahead
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    style={{
                      background: 'var(--icon-pill-red-bg)',
                      color: 'var(--pill-emergency-text)',
                      fontSize: 10,
                      padding: '2px 9px',
                      borderRadius: 99,
                      fontWeight: 500,
                    }}
                  >
                    Emergency: {leaveBalance.availableEmergency}/{leaveBalance.emergencyTotal}
                  </span>
                  <span
                    style={{
                      background: 'var(--icon-pill-green-bg)',
                      color: 'var(--pill-floater-text)',
                      fontSize: 10,
                      padding: '2px 9px',
                      borderRadius: 99,
                      fontWeight: 500,
                    }}
                  >
                    Floater: {leaveBalance.availableFloater}/{leaveBalance.floaterTotal}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending approvals quick view */}
      {pendingPreviewLoading ? (
        <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 24 }}>
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : pendingLeaves.length > 0 ? (
        <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 24 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)' }}>Pending Approvals</h2>
            <button onClick={() => router.push('/manager/approvals')} className="text-xs text-blue-600 hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {pendingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {leave.employee?.displayName ?? 'Employee'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(leave.startDate), 'dd MMM')} → {format(new Date(leave.endDate), 'dd MMM')} ·{' '}
                    {leave.totalDays}d
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveLeaveMutation.mutate({ id: leave.id, action: 'approve' })}
                    className="w-8 h-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm flex items-center justify-center font-bold transition-colors"
                    aria-label="Approve leave"
                    type="button"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => approveLeaveMutation.mutate({ id: leave.id, action: 'reject' })}
                    className="w-8 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm flex items-center justify-center font-bold transition-colors"
                    aria-label="Reject leave"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Announcements */}
      <div
        style={{
          background: 'var(--color-card-bg)',
          border: '0.5px solid var(--color-card-border)',
          borderRadius: 12,
          padding: '16px 18px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)' }}>
            Announcements
          </h2>
          <button
            onClick={() => setAnnouncementForm((s) => ({ ...s, open: !s.open }))}
            className="hover:underline"
            style={{ fontSize: 11, color: 'var(--icon-pill-blue-stroke)', fontWeight: 400 }}
            type="button"
          >
            {announcementForm.open ? 'Cancel' : '+ Post announcement'}
          </button>
        </div>

        {announcementForm.open && (
          <div className="mb-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
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
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a, idx) => {
              const cycle = idx % 4
              const bg =
                cycle === 0
                  ? 'var(--announce-purple-bg)'
                  : cycle === 1
                    ? 'var(--announce-teal-bg)'
                    : cycle === 2
                      ? 'var(--announce-amber-bg)'
                      : 'var(--announce-blue-bg)'

              const titleColor =
                cycle === 0 ? 'var(--announce-purple-title)' : cycle === 1 ? 'var(--announce-teal-title)' : 'var(--color-heading)'
              const bodyColor =
                cycle === 0 ? 'var(--announce-purple-body)' : cycle === 1 ? 'var(--announce-teal-body)' : 'var(--color-muted)'

              return (
                <div
                  key={a.id}
                  style={{
                    background: bg,
                    borderRadius: 9,
                    padding: '10px 12px',
                    marginBottom: 7,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 500, color: titleColor }}>{a.title}</p>
                  <p className="line-clamp-2" style={{ fontSize: 11, marginTop: 2, color: bodyColor }}>
                    {a.content}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
