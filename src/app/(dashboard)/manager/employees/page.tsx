'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'
import { ManagerEmployeeDetailPanel } from '@/components/features/manager/ManagerEmployeeDetailPanel'
import { useManagerEmployees } from '@/hooks/useManagerEmployees'
import { cn } from '@/lib/utils/cn'

export default function ManagerEmployeesPage() {
  const {
    employees,
    filteredEmployees,
    isLoading,
    search,
    setSearch,
    selectedId,
    toggleExpand,
  } = useManagerEmployees()

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader
        title="Team Directory"
        description="View and manage records for your direct reports."
        badge={filteredEmployees.length}
      />

      {/* Search Bar */}
      <div className="flex items-center gap-4 max-w-md bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-300 transition-all group">
        <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members..."
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <TableSkeleton />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState icon="👤" title="No team members" description="You don't have any direct reports assigned yet." />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState icon="🔎" title="No results found" description={`No matches for "${search}"`} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-6 py-4">Name</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-6 py-4">Work Email</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-6 py-4">Job Title</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-6 py-4">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <React.Fragment key={emp.id}>
                    <tr
                      onClick={() => toggleExpand(emp.id)}
                      className={cn(
                        "group transition-all cursor-pointer hover:bg-slate-50/50",
                        selectedId === emp.id && "bg-blue-50/30"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-[13px] font-bold shrink-0 transition-transform group-hover:scale-105">
                            {getInitials(emp.displayName)}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{emp.displayName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">EMP-ID: {emp.employeeId || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right sm:text-left">
                        <span className="text-[13px] text-slate-500 font-medium group-hover:text-blue-600 transition-colors">{emp.workEmail || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[13px] text-slate-600 font-bold">{emp.jobTitle || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <AvailabilityBadge status={emp.availabilityStatus} />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-0 border-none">
                        <AnimatePresence>
                          {selectedId === emp.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                            >
                              <ManagerEmployeeDetailPanel employee={emp} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
