'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'

function SummaryCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-2">{label}</p>
    </div>
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
      const res = await fetch('/api/employee/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
    enabled: !isUserLoading,
  })

  const { data: leaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['employeeLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch leave requests')
      return res.json()
    },
    enabled: !isUserLoading,
  })

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ['employeeTeam'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/team', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch team availability')
      return res.json()
    },
    enabled: !isUserLoading,
  })

  const isLoading = isUserLoading || projectsLoading || leavesLoading || teamLoading
  const user = currentUserData?.user

  const pendingLeaves = leaves.filter((leave: { status: string }) => leave.status === 'PENDING').length
  const availableTeam = team.filter((member: { availabilityStatus: string }) => member.availabilityStatus === 'AVAILABLE').length

  if (isLoading || !user) {
    return <PageSkeleton />
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Employee Dashboard"
        description="Overview of your leave, projects, and team availability."
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <SummaryCard value={projects.length} label="Active projects" />
          <SummaryCard value={pendingLeaves} label="Pending leave requests" />
          <SummaryCard value={team.length} label="Team members" />
          <SummaryCard value={`${availableTeam} available`} label="Available today" />
        </div>

        <div className="grid gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xl font-bold overflow-hidden">
                {user.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  getInitials(user.displayName)
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Welcome back, {user.firstName}</p>
                <p className="text-sm text-slate-500">{user.jobTitle ?? 'Team member'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Leave balance</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{currentUserData.balance.availableStandard} days</p>
                <p className="text-sm text-slate-500">Standard leave remaining</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last project update</p>
                <p className="mt-2 text-sm text-slate-700">{projects.length > 0 ? 'Updated recently' : 'No active project yet'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => router.push('/employee/projects')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Browse assigned projects
              </button>
              <button
                onClick={() => router.push('/employee/my-leaves')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Review leave history
              </button>
              <button
                onClick={() => router.push('/employee/my-team')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Check team availability
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-semibold text-slate-900">Team snapshot</h3>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Updated now</span>
        </div>

        {team.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No team members yet"
            description="Your manager will assign team members once the project starts."
          />
        ) : (
          <div className="grid gap-3">
            {team.slice(0, 4).map((member: any) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 overflow-hidden">
                    {member.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.profilePictureUrl} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(member.displayName)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{member.displayName}</p>
                    <p className="text-xs text-slate-500">{member.jobTitle ?? 'Team member'}</p>
                  </div>
                </div>
                <AvailabilityBadge status={member.availabilityStatus} />
              </div>
            ))}
            {team.length > 4 && (
              <p className="text-sm text-slate-500">+{team.length - 4} more team members</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
