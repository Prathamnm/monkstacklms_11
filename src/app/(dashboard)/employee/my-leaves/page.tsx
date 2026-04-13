'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { format, parseISO, isBefore } from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { LeaveRequest } from '@/types/leave'

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const
type Tab = (typeof TABS)[number]

const TAB_STATUS_MAP: Record<Tab, string | null> = {
  All: null,
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
  Cancelled: 'CANCELLED',
}

export default function MyLeavesPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load leaves')
      return res.json()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/cancel/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to cancel leave')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request cancelled')
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      setCancelId(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setCancelId(null)
    },
  })

  const statusFilter = TAB_STATUS_MAP[activeTab]
  const filteredLeaves = statusFilter
    ? leaves.filter((l) => l.status === statusFilter)
    : leaves

  function canCancel(leave: LeaveRequest): boolean {
    if (leave.status !== 'PENDING' && leave.status !== 'APPROVED') return false
    return isBefore(new Date(), parseISO(leave.startDate))
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="My Leaves" description="Your leave history and balance" />

      <div className="space-y-6">
        <LeaveBalanceCard />

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
                {tab !== 'All' && (
                  <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {leaves.filter((l) => l.status === TAB_STATUS_MAP[tab]).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : filteredLeaves.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No leave requests"
              description="You have no leave requests in this category."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLeaves.map((leave) => (
                <motion.div
                  key={leave.id}
                  layout
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                >
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {leave.title && (
                          <span className="text-slate-800 text-sm font-semibold">{leave.title}</span>
                        )}
                        {leave.title && <span className="text-slate-300 text-xs">·</span>}
                        <span className="text-slate-900 text-sm font-medium">
                          {formatDateRange(leave.startDate, leave.endDate)}
                        </span>
                        <span className="text-slate-400 text-xs">·</span>
                        <span className="text-slate-500 text-xs">
                          {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                        </span>
                        {leave.isEmergency && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">Emergency</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{leave.reason}</p>
                    </div>
                    <LeaveStatusBadge status={leave.status} />
                    <div className="flex-shrink-0">
                      {canCancel(leave) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCancelId(leave.id)
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === leave.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 px-5 py-4 border-t border-slate-100"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Submitted</p>
                          <p className="text-slate-700">{format(parseISO(leave.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                        {leave.approver && (
                          <div>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                              {leave.status === 'APPROVED' ? 'Approved By' : 'Reviewed By'}
                            </p>
                            <p className="text-slate-700">{leave.approver.displayName}</p>
                          </div>
                        )}
                        {leave.rejectionReason && (
                          <div className="col-span-2">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Rejection Reason</p>
                            <p className="text-red-600 text-sm">{leave.rejectionReason}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Full Reason</p>
                          <p className="text-slate-700">{leave.reason}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel this leave request? This action cannot be undone."
        confirmLabel="Cancel Leave"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}
