'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Search, Download } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { ExportEmployeesModal } from '@/components/hr/ExportEmployeesModal'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

export default function HREmployeesPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['hrEmployees'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
  })

  const filtered = employees.filter(
    (e: any) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (e.workEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Team Monkstack"
        description="Manage your workforce and oversee roles. Employee data is synced from Azure."
        badge={filtered.length}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={16} /> Download Data
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative w-full max-w-md mx-auto">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, role or email..."
          className="w-full rounded-xl border border-slate-200 pl-9 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👤" title="No employees found" description="Try a different search term. User creation happens in Azure Entra ID." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status Today</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((employee: any) => (
                  <tr key={employee.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-105">
                          {getInitials(employee.displayName)}
                        </div>
                        <div>
                          <p className="text-slate-900 font-medium group-hover:text-purple-600 transition-colors">{employee.displayName}</p>
                          <a
                            href={`mailto:${employee.workEmail ?? employee.email}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors text-[11px]"
                            onClick={e => e.stopPropagation()}
                          >
                            {employee.workEmail ?? employee.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider', ROLE_COLORS[employee.role as keyof typeof ROLE_COLORS])}>
                        {ROLE_LABELS[employee.role as keyof typeof ROLE_LABELS]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <AvailabilityBadge status={employee.availabilityStatus} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => router.push(`/hr/employees/${employee.id}`)}
                        className="text-purple-600 hover:text-purple-700 font-semibold text-xs transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExportEmployeesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        totalCount={filtered.length}
      />
    </motion.div>
  )
}
