'use client'

import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_COLORS, ROLE_LABELS } from '@/constants/roles'

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
  const isEmployee = user.role === 'EMPLOYEE'

  const metrics = [
    { label: 'Remaining Standard Leave', value: balance.availableStandard, description: `${balance.standardTotal} total` },
    { label: 'Remaining Emergency Leave', value: balance.availableEmergency, description: `${balance.emergencyTotal} total` },
    { label: 'Pending Leave Requests', value: balance.pendingDays, description: 'Awaiting approval' },
    { label: 'Effective Available Days', value: balance.effectiveAvailable, description: 'Including pending days' },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="My Profile"
        description="Your personal details, leave summary, and quick actions."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
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

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">Email</p>
                <p className="mt-1 text-slate-900 break-all">{user.email}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">Department</p>
                <p className="mt-1 text-slate-900">{user.department ?? 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">Status</p>
                <p className="mt-1 text-slate-900">{user.employmentStatus ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">Manager</p>
                <p className="mt-1 text-slate-900">{user.managerId ? 'Assigned' : 'Not assigned'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => router.push('/employee/apply-leave')}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Request Leave
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <StatCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
            <div className="mt-4 grid gap-3">
              {isEmployee ? (
                <> 
                  <button
                    onClick={() => router.push('/employee/my-leaves')}
                    className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    View leave history
                  </button>
                  <button
                    onClick={() => router.push('/employee/my-team')}
                    className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    See team availability
                  </button>
                  <button
                    onClick={() => router.push('/employee/projects')}
                    className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    Review assigned projects
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/')}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  Return to dashboard
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
