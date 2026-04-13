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

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['employeeProjects'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/projects', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
    enabled: !isUserLoading,
  })

  const { data: leaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['employeeLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch leave requests')
      return res.json()
    },
    enabled: !isUserLoading,
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

  const isLoading = isUserLoading || projectsLoading || leavesLoading
  const user = currentUserData?.user
  const balance = currentUserData?.balance

  const pendingLeaves = leaves.filter((leave: { status: string }) => leave.status === 'PENDING').length

  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  if (isLoading || !user) return <PageSkeleton />

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
              <p className="text-sm text-slate-500">{user.designation ?? user.jobTitle ?? 'Team member'}</p>
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block', ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-400 flex-shrink-0">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div variants={container} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard value={projects.length} label="Active projects" />
        <SummaryCard value={pendingLeaves} label="Pending leave requests" />
        <motion.div variants={item} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:col-span-2 xl:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Leave Balance</p>
          <div className="flex gap-12">
            <div>
              <p className="text-2xl font-semibold text-slate-900">{balance?.availableStandard ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-1">Standard</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{balance?.availableEmergency ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-1">Emergency</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick actions */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => router.push('/employee/projects')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Browse assigned projects</button>
          <button onClick={() => router.push('/employee/my-leaves')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Review leave history</button>
          <button onClick={() => router.push('/employee/my-team')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Check team availability</button>
          <button onClick={() => router.push('/employee/apply-leave')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Apply for Leave</button>
        </div>
      </div>

      {/* Announcements */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Announcements</h3>
        {announcements.length === 0 ? (
          <EmptyState icon="📢" title="No announcements yet" description="Announcements from HR and management will appear here." />
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-slate-400 mt-2">{a.poster?.displayName} · {format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  )
}
