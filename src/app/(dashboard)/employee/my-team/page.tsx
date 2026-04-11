'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTeamAvailability } from '@/hooks/useTeamAvailability'
import { PageHeader } from '@/components/shared/PageHeader'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { ProjectTag } from '@/components/employee/ProjectTag'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils/formatters'
import { format } from 'date-fns'

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
}

export default function MyTeamPage() {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const { data: team = [], isLoading } = useTeamAvailability()

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="My Team"
        description="Your teammates' availability today"
        badge={team.length}
        actions={
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Table
            </button>
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : team.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No team members"
          description="Your team members will appear here once you're assigned to a project."
        />
      ) : viewMode === 'card' ? (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {team.map((member) => (
            <motion.div
              key={member.id}
              variants={itemVariants}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {member.profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.profilePictureUrl} alt={member.displayName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    getInitials(member.displayName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-slate-900 text-sm font-semibold truncate">{member.displayName}</p>
                  <p className="text-slate-500 text-xs truncate">{member.jobTitle}</p>
                </div>
              </div>
              <AvailabilityBadge status={member.availabilityStatus} />
              {member.currentLeaveEnd && member.availabilityStatus !== 'AVAILABLE' && (
                <p className="text-slate-400 text-xs mt-2">
                  Until {format(new Date(member.currentLeaveEnd), 'MMM d')}
                </p>
              )}
              {member.projects && member.projects.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {member.projects.slice(0, 2).map((p) => (
                    <ProjectTag key={p.id} name={p.name} code={p.code} color={p.color} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(member.displayName)}
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-medium">{member.displayName}</p>
                        <p className="text-slate-500 text-xs">{member.jobTitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{member.department ?? '—'}</td>
                  <td className="px-5 py-3">
                    <AvailabilityBadge status={member.availabilityStatus} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {member.projects?.slice(0, 2).map((p) => (
                        <ProjectTag key={p.id} name={p.name} code={p.code} color={p.color} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
