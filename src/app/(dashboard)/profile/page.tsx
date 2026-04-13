'use client'

import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { ROLE_COLORS, ROLE_LABELS } from '@/constants/roles'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

function StatCard({ label, value, description }: { label: string; value: string | number; description?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { data, isLoading, isError } = useCurrentUser()

  if (isLoading) return <PageSkeleton />
  if (isError || !data) return null

  const { user, balance } = data

  const leaveRouteMap: Record<string, string> = {
    EMPLOYEE: '/employee/apply-leave',
    MANAGER: '/manager/apply-leave',
    HR: '/hr/apply-leave',
    ADMIN: '/employee/apply-leave',
  }

  const dashboardRouteMap: Record<string, string> = {
    EMPLOYEE: '/employee/dashboard',
    MANAGER: '/manager/dashboard',
    HR: '/hr/dashboard',
    ADMIN: '/admin/dashboard',
  }

  const leavesRouteMap: Record<string, string> = {
    EMPLOYEE: '/employee/my-leaves',
    MANAGER: '/manager/my-leaves',
    HR: '/hr/my-leaves',
    ADMIN: '/employee/my-leaves',
  }

  const metrics = [
    { label: 'Remaining Standard Leave', value: balance.availableStandard, description: `${balance.standardTotal} total` },
    { label: 'Remaining Emergency Leave', value: balance.availableEmergency, description: `${balance.emergencyTotal} total` },
    { label: 'Pending Leave Requests', value: balance.pendingDays, description: 'Awaiting approval' },
    { label: 'Effective Available Days', value: balance.effectiveAvailable, description: 'Excluding pending days' },
  ]

  const profileFields = [
    { label: 'Email', value: user.email },
    { label: 'Designation', value: user.designation ?? 'N/A' },
    { label: 'Phone', value: user.phoneNumber ?? 'N/A' },
    { label: 'Status', value: user.employmentStatus ?? 'Unknown' },
    { label: 'Emergency Contact', value: user.emergencyContact ?? 'N/A' },
    { label: 'Join Date', value: user.joinDate ? (() => { try { return format(new Date(user.joinDate as string), 'dd MMM yyyy') } catch { return 'N/A' } })() : 'N/A' },
    { label: 'Manager', value: user.managerId ? 'Assigned' : 'Not assigned' },
  ]

  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-6 lg:p-8 space-y-6"
    >
      <PageHeader title={`Welcome, ${firstName}`} description="Your personal details, leave summary, and quick actions." />

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
        {/* Identity card */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0">
              {user.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                getInitials(user.displayName)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-slate-900 truncate">{user.displayName}</p>
              <p className="text-slate-500 mt-1">{user.jobTitle ?? 'Employee'}</p>
              <span className={`inline-flex mt-3 items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {/* Profile fields grid */}
          <div className="mt-6 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {profileFields.map((f) => (
                <div key={f.label}>
                  <p className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">{f.label}</p>
                  <p className="mt-1 text-slate-900 break-all">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button onClick={() => router.push(leaveRouteMap[user.role])}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Request Leave
            </button>
            <button onClick={() => router.push(leavesRouteMap[user.role])}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              View Leave History
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Quick actions</h2>
            <div className="grid gap-3">
              <button onClick={() => router.push(dashboardRouteMap[user.role])}
                className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                Go to Dashboard
              </button>
              <button onClick={() => router.push(leavesRouteMap[user.role])}
                className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                View leave history
              </button>
              {user.role === 'EMPLOYEE' && (
                <button onClick={() => router.push('/employee/my-team')}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  See team availability
                </button>
              )}
              {(user.role === 'HR' || user.role === 'ADMIN') && (
                <button onClick={() => router.push('/hr/employees')}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  Manage employees
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  )
}
