'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { format, parseISO } from 'date-fns'
import { Check, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials, formatDays } from '@/lib/utils/formatters'
import { formatDateRange, timeAgo } from '@/lib/utils/dateUtils'
import type { LeaveRequest } from '@/types/leave'

export default function ManagerApprovalsPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalReason, setApprovalReason] = useState('')

  const { data: approvals = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['managerApprovals'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/approvals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load approvals')
      return res.json()
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string
      action: 'approve' | 'reject'
      reason?: string
    }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/approvals/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Action failed')
      }
      return res.json()
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave rejected')
      queryClient.invalidateQueries({ queryKey: ['managerApprovals'] })
      setSelectedLeave(null)
      setApproveDialogOpen(false)
      setRejectDialogOpen(false)
      setRejectionReason('')
      setApprovalReason('')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Approvals"
        description="Review and act on pending leave requests"
        badge={approvals.length}
      />

      <div className="flex gap-6">
        {/* Left: Queue */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {isLoading ? (
              <TableSkeleton />
            ) : approvals.length === 0 ? (
              <EmptyState
                icon="✅"
                title="All caught up!"
                description="There are no pending leave requests to review."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {approvals.map((leave) => (
                  <div
                    key={leave.id}
                    onClick={() => setSelectedLeave(leave)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                      selectedLeave?.id === leave.id
                        ? 'bg-blue-50 border-l-2 border-blue-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(leave.employee?.displayName ?? 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 text-sm font-semibold">{leave.employee?.displayName}</p>
                      <p className="text-slate-500 text-xs">
                        {formatDateRange(leave.startDate, leave.endDate)} · {formatDays(leave.totalDays)}
                      </p>
                      <p className="text-slate-400 text-xs">{timeAgo(leave.createdAt)}</p>
                    </div>
                    <LeaveStatusBadge status={leave.status} />
                    <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Pane */}
        <AnimatePresence>
          {selectedLeave && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-80 flex-shrink-0"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6 space-y-5">
                {/* Employee card */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {getInitials(selectedLeave.employee?.displayName ?? 'U')}
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold">{selectedLeave.employee?.displayName}</p>
                    <p className="text-slate-500 text-xs">{selectedLeave.employee?.email}</p>
                  </div>
                </div>

                {/* Leave details */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Period</span>
                    <span className="text-slate-900 font-medium text-right">
                      {formatDateRange(selectedLeave.startDate, selectedLeave.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Duration</span>
                    <span className="text-slate-900 font-medium">{formatDays(selectedLeave.totalDays)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Submitted</span>
                    <span className="text-slate-900">{format(parseISO(selectedLeave.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Reason</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{selectedLeave.reason}</p>
                </div>

                {/* Actions */}
                {selectedLeave.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setRejectDialogOpen(true)}
                      className="flex-1 btn-danger flex items-center justify-center gap-1.5"
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      onClick={() => setApproveDialogOpen(true)}
                      className="flex-1 btn-success flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Approve
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Approve dialog */}
      <ConfirmDialog
        isOpen={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={() =>
          selectedLeave &&
          actionMutation.mutate({ id: selectedLeave.id, action: 'approve', reason: approvalReason })
        }
        title="Approve Leave Request"
        description={`Approve leave for ${selectedLeave?.employee?.displayName}?`}
        confirmLabel="Approve"
        isLoading={actionMutation.isPending}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Comments (Optional)
          </label>
          <textarea
            value={approvalReason}
            onChange={(e) => setApprovalReason(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Add any internal comments or notes..."
          />
        </div>
      </ConfirmDialog>

      {/* Reject dialog */}
      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false)
          setRejectionReason('')
        }}
        onConfirm={() =>
          selectedLeave &&
          actionMutation.mutate({
            id: selectedLeave.id,
            action: 'reject',
            reason: rejectionReason,
          })
        }
        title="Reject Leave Request"
        description={`Reject leave for ${selectedLeave?.employee?.displayName}?`}
        confirmLabel="Reject"
        variant="danger"
        isLoading={actionMutation.isPending}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Please provide a reason..."
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
