'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { ProjectTag } from '@/components/employee/ProjectTag'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { EmployeeWithAvailability } from '@/types/employee'
import type { LeaveRequest } from '@/types/leave'

function EmployeeDetailPanel({ id }: { id: string }) {
  const { instance } = useMsal()
  const [activeTab, setActiveTab] = useState<'Personal Details' | 'Work Details' | 'Leave Log'>('Personal Details')

  const { data, isLoading } = useQuery({
    queryKey: ['managerEmployeeDetail', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch details')
      return res.json()
    }
  })

  if (isLoading) return <div className="p-8 text-center text-slate-500 text-sm border-t border-slate-100 bg-slate-50/50">Loading detailed profile...</div>
  if (!data) return <div className="p-8 text-center text-slate-500 text-sm border-t border-slate-100 bg-slate-50/50">Error loading data.</div>

  const { leaveBalance: balance, leaveRequests: leaves, manager } = data

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="bg-slate-50/50 border-t border-slate-100 overflow-hidden">
      
      {/* Small Tabs */}
      <div className="flex border-b border-slate-200 px-6 pt-2 bg-white/50">
        {['Personal Details', 'Work Details', 'Leave Log'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'Personal Details' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Phone Number</p><p className="text-sm font-medium text-slate-900">{data.phoneNumber || '—'}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Emergency Contact</p><p className="text-sm font-medium text-slate-900">{data.emergencyContact || '—'}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Join Date</p><p className="text-sm font-medium text-slate-900">{data.joinDate ? format(parseISO(data.joinDate), 'MMM d, yyyy') : '—'}</p></div>
          </div>
        )}

        {activeTab === 'Work Details' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Designation</p><p className="text-sm font-medium text-slate-900">{data.designation || '—'}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Reporting Manager</p><p className="text-sm font-medium text-slate-900">{manager?.displayName || 'Unassigned'}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Role Access</p>
               <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${ROLE_COLORS[data.role as keyof typeof ROLE_COLORS]}`}>{ROLE_LABELS[data.role as keyof typeof ROLE_LABELS]}</span>
            </div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Status</p>
               <span className="text-xs font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">{data.employmentStatus}</span>
            </div>
          </div>
        )}

        {activeTab === 'Leave Log' && (
          <div className="space-y-6">
            {balance ? (
              <div className="flex gap-8 bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-fit">
                <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Standard Remaining</p><p className="text-xl font-bold text-slate-900">{balance.standardTotal + balance.standardCarryForward - balance.standardUsed}</p></div>
                <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Emergency Remaining</p><p className="text-xl font-bold text-slate-900">{balance.emergencyTotal - balance.emergencyUsed}</p></div>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 inline-block px-3 py-1.5 rounded-lg border border-amber-200">Balance not initialized</p>
            )}

            {leaves && leaves.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr><th className="p-3">Period</th><th className="p-3">Days</th><th className="p-3">Reason</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaves.map((l: LeaveRequest) => (
                      <tr key={l.id}>
                        <td className="p-3 font-medium text-slate-700">{formatDateRange(l.startDate, l.endDate)}</td>
                        <td className="p-3 text-slate-600">{l.totalDays}</td>
                        <td className="p-3 text-slate-500 truncate max-w-[200px]">{l.reason}</td>
                        <td className="p-3"><LeaveStatusBadge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No leave requests found.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ManagerEmployeesPage() {
  const { instance } = useMsal()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: employees = [], isLoading } = useQuery<EmployeeWithAvailability[]>({
    queryKey: ['managerEmployees'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
  })

  const filtered = employees.filter(
    (e) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Team Monkstack" description="All active team members and their records." badge={employees.length} />

      {/* Search */}
      <div className="relative w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members..." className="w-full rounded-xl border border-slate-200 pl-9 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👤" title="No employees found" description="Adjust your search query." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Status Today</th>
                  <th className="px-5 py-4">Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(employee => (
                  <React.Fragment key={employee.id}>
                    <tr onClick={() => setExpandedId(expandedId === employee.id ? null : employee.id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-105">
                            {getInitials(employee.displayName)}
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium group-hover:text-blue-600 transition-colors">{employee.displayName}</p>
                            <p className="text-slate-500 text-[11px]">
                              <a href={`mailto:${employee.email}`} className="hover:text-blue-600 hover:underline transition-colors" onClick={e => e.stopPropagation()}>
                                {employee.email}
                              </a>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4"><AvailabilityBadge status={employee.availabilityStatus} /></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {employee.projects?.slice(0, 3).map(p => <ProjectTag key={p.id} name={p.name} code={p.code} color={p.color} />)}
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === employee.id && (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <EmployeeDetailPanel id={employee.id} />
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
