'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { cn } from '@/lib/utils/cn'

export default function TeamMonkstackPage() {
  const { instance } = useMsal()
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['allEmployees', search],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const url = search
        ? `/api/employees?search=${encodeURIComponent(search)}`
        : '/api/employees'
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
    staleTime: 0,
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="p-4 lg:p-6 space-y-4"
    >
      <PageHeader
        title="Team Monkstack"
        description="Everyone at Monkstack - search by name, role, or email"
        badge={employees.length}
      />

      <div className="flex justify-center">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role or email..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton />
        ) : employees.length === 0 ? (
          <EmptyState icon="👤" title="No employees found" description="Try a different search term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(
                  (emp: {
                    id: string
                    displayName: string
                    email: string
                    role: keyof typeof ROLE_LABELS
                    profilePictureUrl?: string | null
                    availabilityStatus: string
                  }) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.profilePictureUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={emp.profilePictureUrl} alt={emp.displayName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              getInitials(emp.displayName)
                            )}
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium">{emp.displayName}</p>
                            <p className="text-slate-500 text-[11px]">{(emp as any).jobTitle || 'Team Member'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded font-medium',
                            ROLE_COLORS[emp.role as keyof typeof ROLE_COLORS]
                          )}
                        >
                          {ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <AvailabilityBadge status={emp.availabilityStatus as 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM'} />
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`mailto:${emp.email}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline text-sm transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {emp.email}
                        </a>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
