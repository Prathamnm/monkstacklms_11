'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import type { Announcement } from '@/types/announcement'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'
import { UpcomingLeavesCard } from '@/components/shared/UpcomingLeavesCard'

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Banner (Full Width) */}
        <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
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

        {/* Main Dashboard Grid — 6 Columns for precise proportionality */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }} className="responsive-grid">
          
          {/* Row 2 — Stats & Balance */}
          <div style={{ gridColumn: 'span 1', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: 12 }}>Total requests</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats?.totalThisMonth ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10, opacity: 0.8 }}>This month</p>
          </div>

          <div style={{ gridColumn: 'span 1', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: 12 }}>Pending Requests</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats?.pendingCount ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10, opacity: 0.8 }}>Awaiting approval</p>
          </div>

          <div style={{ gridColumn: 'span 2', height: '100%' }}>
            <UpcomingLeavesCard />
          </div>

          <div style={{ gridColumn: 'span 2', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: 12 }}>Leave balance</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '14px 12px', border: '0.5px solid var(--color-border-tertiary)' }}>
                <p style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Standard</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>{balance?.availableStandard ?? '—'}</p>
              </div>
              <div style={{ background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '14px 12px', border: '0.5px solid var(--color-border-tertiary)' }}>
                <p style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Emergency</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>{balance?.availableEmergency ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Row 3 — Attendance & Policies */}
          <div style={{ gridColumn: 'span 4', width: '100%' }}>
            <AttendanceCard />
          </div>

          <div style={{ gridColumn: 'span 2', width: '100%', display: 'flex' }}>
            <PoliciesSection canUpload={false} />
          </div>
        </div>

        {/* Row 3 — Announcements (Full Width) */}
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '16px' }}>
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
