'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils/formatters'
import type { ProjectWithAvailability } from '@/types/project'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()

  const { data: project, isLoading } = useQuery<ProjectWithAvailability>({
    queryKey: ['project', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load project')
      return res.json()
    },
  })

  if (isLoading) return <PageSkeleton />
  if (!project) return null

  return (
    <div className="p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{project.code}</span>
        </div>
        {project.description && <p className="text-slate-500 mb-2">{project.description}</p>}
        <div className="flex gap-4 text-sm text-slate-500">
          <span>{project.availableMembersCount}/{project.totalMembersCount} available today</span>
          <span>{project.isActive ? '✅ Active' : '❌ Inactive'}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-slate-900 font-semibold text-base mb-4">Team Members</h2>
        <div className="space-y-3">
          {project.members?.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {getInitials(member.employee?.displayName ?? 'U')}
              </div>
              <div className="flex-1">
                <p className="text-slate-900 text-sm font-medium">{member.employee?.displayName}</p>
                <p className="text-slate-500 text-xs">{member.employee?.jobTitle}</p>
              </div>
              {member.employee && (
                <AvailabilityBadge status={member.employee.availabilityStatus} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
