'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils/formatters'
import type { ProjectWithAvailability } from '@/types/project'

const containerVariants = {
  animate: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
}

export default function EmployeeProjectsPage() {
  const { instance } = useMsal()

  const { data: projects, isLoading } = useQuery<ProjectWithAvailability[]>({
    queryKey: ['myProjects'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load projects')
      return res.json()
    },
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="My Projects"
        description="Projects you're assigned to and your team's availability"
        badge={projects?.length}
      />

      {!projects?.length ? (
        <EmptyState
          icon="📁"
          title="No projects assigned"
          description="You haven't been assigned to any projects yet. Contact your manager."
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {projects.map((project) => (
            <motion.div
              key={project.id}
              variants={itemVariants}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Project header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className="font-semibold text-slate-900 text-base">{project.name}</h3>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {project.code}
                  </span>
                </div>
                {project.description && (
                  <p className="text-slate-500 text-sm">{project.description}</p>
                )}
              </div>

              {/* Team availability */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Team Today</p>
                  <span className="text-xs text-slate-600">
                    {project.availableMembersCount}/{project.totalMembersCount} available
                  </span>
                </div>

                {/* Coverage bar */}
                <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${project.totalMembersCount > 0
                        ? (project.availableMembersCount / project.totalMembersCount) * 100
                        : 0}%`,
                    }}
                  />
                </div>

                <div className="space-y-2">
                  {project.members?.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {member.employee?.profilePictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.employee.profilePictureUrl}
                            alt={member.employee.displayName}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          getInitials(member.employee?.displayName ?? 'U')
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-xs font-medium truncate">
                          {member.employee?.displayName}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{member.employee?.jobTitle}</p>
                      </div>
                      {member.employee && (
                        <AvailabilityBadge
                          status={member.employee.availabilityStatus}
                          className="flex-shrink-0"
                        />
                      )}
                    </div>
                  ))}
                  {(project.members?.length ?? 0) > 5 && (
                    <p className="text-slate-400 text-xs pl-10">
                      +{(project.members?.length ?? 0) - 5} more members
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
