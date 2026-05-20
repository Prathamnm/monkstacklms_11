'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { Download, Search, Filter, Calendar, Users, ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { getInitials } from '@/lib/utils/formatters'
import { Card } from '@/components/shared/DesignSystem'
import { cn } from '@/lib/utils/cn'
import type { LeaveRequest } from '@/types/leave'

export default function HRLeavesPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leaves
    return leaves.filter((leave) => {
      const emp = leave.employee?.displayName ?? ''
      const blob = [leave.title, leave.reason, emp, leave.employee?.email ?? '']
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [leaves, search])

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader
        title="Leave Management"
        description="Monitor and manage all leave requests across the organization"
        badge={filtered.length}
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
            <Download size={14} /> Export
          </button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, title, or reason..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 px-3 text-slate-400 border-r border-slate-100">
            <Filter size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Filter Status</span>
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:text-blue-600 transition-colors px-2 py-1"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        {isLoading ? (
          <div className="p-8">
            <TableSkeleton rows={8} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Users size={32} />
            </div>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">No requests found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or status filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <Users size={12} />
                      Employee
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} />
                      Leave Period
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Days</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-left">Submitted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((leave, index) => (
                  <tr
                    key={leave.id}
                    onClick={() => router.push(`/hr/leaves/${leave.id}`)}
                    className={cn(
                      "group cursor-pointer hover:bg-slate-50/80 transition-all",
                      index % 2 === 1 && "bg-slate-50/20"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-[11px] font-bold group-hover:scale-105 transition-transform">
                          {getInitials(leave.employee?.displayName ?? 'U')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {leave.employee?.displayName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {leave.employee?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800">
                          {leave.title}
                        </p>
                        <p className="text-slate-500 font-medium whitespace-nowrap">
                          {formatDateRange(leave.startDate, leave.endDate)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-200">
                        {leave.totalDays}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <LeaveStatusBadge status={leave.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-bold uppercase tracking-tighter text-[10px]">
                      {format(parseISO(leave.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-slate-100 group-hover:border-blue-500 group-hover:shadow-lg group-hover:shadow-blue-200">
                        Details
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
