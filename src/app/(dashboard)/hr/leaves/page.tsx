'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { Search, Download } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { getInitials } from '@/lib/utils/formatters'
import type { LeaveRequest } from '@/types/leave'

export default function HRLeavesPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['hrLeaves', statusFilter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/hr/leaves${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load leaves')
      return res.json()
    },
  })

  const filtered = leaves.filter((l) =>
    l.employee?.displayName.toLowerCase().includes(search.toLowerCase()) ||
    l.employee?.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="All Leaves"
        description="View and manage all leave requests across the organization"
        badge={filtered.length}
        actions={
          <button className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export
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
            placeholder="Search by employee..."
            className="input w-full pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📋" title="No leave requests found" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Days</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((leave) => (
                <tr
                  key={leave.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/hr/leaves/${leave.id}`)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(leave.employee?.displayName ?? 'U')}
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-medium">{leave.employee?.displayName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-700 text-sm">
                    {formatDateRange(leave.startDate, leave.endDate)}
                  </td>
                  <td className="px-5 py-3 text-slate-700 text-sm">{leave.totalDays}</td>
                  <td className="px-5 py-3">
                    <LeaveStatusBadge status={leave.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-sm">
                    {format(parseISO(leave.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {leave.status === 'APPROVED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/hr/leaves/${leave.id}`)
                          }}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Revoke
                        </button>
                      )}
                      <span className="text-blue-600 text-xs font-medium">View →</span>
                    </div>
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
