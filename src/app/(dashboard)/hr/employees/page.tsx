'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { EmployeeWithAvailability } from '@/types/employee'
import type { Role } from '@/types/auth'

export default function HREmployeesPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')

  const { data: employees = [], isLoading } = useQuery<EmployeeWithAvailability[]>({
    queryKey: ['hrEmployees', statusFilter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
  })

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.jobTitle ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || e.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Team Monkstack"
        description="Full employee directory with edit access"
        badge={filtered.length}
        actions={
          <button
            onClick={() => router.push('/hr/lifecycle/onboard')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Onboard Employee
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="input w-full pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
          className="input"
        >
          <option value="ALL">All Roles</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👤" title="No employees found" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Designation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Reporting To</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Join Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(employee.displayName)}
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-medium">{employee.displayName}</p>
                        <p className="text-slate-500 text-xs">
                          <a
                            href={`mailto:${employee.email}`}
                            className="hover:text-blue-600 hover:underline transition-colors"
                          >
                            {employee.email}
                          </a>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[employee.role]}`}>
                      {ROLE_LABELS[employee.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{employee.designation ?? employee.jobTitle ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{employee.managerName ?? '—'}</td>
                  <td className="px-5 py-3">
                    <AvailabilityBadge status={employee.availabilityStatus} />
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-sm">
                    {format(parseISO(employee.joinDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => router.push(`/hr/employees/${employee.id}`)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
