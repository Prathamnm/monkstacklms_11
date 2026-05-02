'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import type { Announcement } from '@/types/announcement'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'

const container = { animate: { transition: { staggerChildren: 0.07 } } }
const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

function SummaryCard({ value, label }: { value: string | number; label: string }) {
  return (
    <motion.div variants={item} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-2">{label}</p>
    </motion.div>
  )
}

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const { instance } = useMsal()
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser()
  const user = currentUserData?.user
  const balance = currentUserData?.balance

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['leaveStats', user?.id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/requests/stats?userId=${user?.id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (!res.ok) throw new Error('Failed to fetch leave stats')
      return res.json()
    },
    enabled: !!user?.id,
  })

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
    enabled: !isUserLoading,
  })

  const isLoading = isUserLoading || statsLoading

  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  if (isLoading || !user) return <PageSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{ padding: '16px', background: 'var(--color-page-bg)', minHeight: '100vh' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="responsive-grid">

        {/* Row 1 — Welcome Banner (spans all 3 columns) */}
        <div style={{ gridColumn: '1 / -1', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-background-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-info)', fontSize: 14, fontWeight: 500, overflow: 'hidden', flexShrink: 0 }}>
                {user?.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePictureUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(user?.displayName ?? 'User')
                )}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>Welcome back, {firstName} 👋</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{user.jobTitle ?? 'Team member'}</p>
              </div>
            </div>
            <div style={{ background: 'var(--color-background-secondary)', padding: '6px 12px', borderRadius: '99px', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400, flexShrink: 0 }}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Row 2 — Three stat cards (1 column each) */}
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Total leave requests</p>
          <p style={{ fontSize: 32, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats?.totalThisMonth ?? 0}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{(stats?.totalThisMonth ?? 0) === 0 ? 'No requests this month' : 'This month'}</p>
        </div>

        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Pending leave requests</p>
          <p style={{ fontSize: 32, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats?.pendingCount ?? 0}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{(stats?.pendingCount ?? 0) === 0 ? 'Nothing awaiting approval' : 'Awaiting approval'}</p>
        </div>

        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Leave balance</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--color-background-secondary)', borderRadius: '8px', padding: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Standard</p>
              <p style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{balance?.availableStandard ?? '—'}</p>
            </div>
            <div style={{ background: 'var(--color-background-secondary)', borderRadius: '8px', padding: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Emergency</p>
              <p style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{balance?.availableEmergency ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Row 3 — Attendance (2 columns) + Company Policies (1 column) */}
        <div style={{ gridColumn: '1 / 3', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 12 }}>Attendance — April 2026</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { day: 'Fri', date: 'Apr 24', status: 'Weekend', color: 'var(--color-text-secondary)' },
              { day: 'Sat', date: 'Apr 25', status: 'Weekend', color: 'var(--color-text-secondary)' },
              { day: 'Sun', date: 'Apr 26', status: 'Weekend', color: 'var(--color-text-secondary)' },
              { day: 'Mon', date: 'Apr 27', status: 'No data', color: 'var(--color-text-warning)' },
              { day: 'Tue', date: 'Apr 28', status: 'No data', color: 'var(--color-text-warning)' },
              { day: 'Wed', date: 'Apr 29', status: 'No data', color: 'var(--color-text-warning)' },
              { day: 'Thu', date: 'Apr 30', status: 'No data', color: 'var(--color-text-warning)' },
            ].map((row, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', borderBottom: idx < 6 ? '0.5px solid var(--color-border-tertiary)' : 'none', padding: '8px 0' }}>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{row.day}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{row.date}</p>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 12, height: 1, background: 'var(--color-border-tertiary)' }} />
                  <span style={{ width: 12, height: 1, background: 'var(--color-border-tertiary)' }} />
                  <span style={{ width: 12, height: 1, background: 'var(--color-border-tertiary)' }} />
                </div>
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 400, padding: '4px 10px', borderRadius: '99px', background: row.status === 'Weekend' ? 'var(--color-background-secondary)' : 'var(--color-background-warning)', color: row.color }}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 12 }}>Company policies</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth={1.5}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1={16} y1={13} x2={8} y2={13} />
                <line x1={16} y1={17} x2={8} y2={17} />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No policies uploaded yet</p>
          </div>
        </div>

        {/* Row 4 — Announcements (spans all 3 columns) */}
        <div style={{ gridColumn: '1 / -1', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 12 }}>Announcements</p>
          {announcements.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth={1.5}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No announcements yet — posts from HR and management will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id} style={{ background: 'var(--color-background-secondary)', borderRadius: '8px', padding: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{a.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{a.content}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>{a.poster?.displayName} · {format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
