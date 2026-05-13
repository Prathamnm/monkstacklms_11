'use client'

import { motion } from 'framer-motion'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { useManagerApprovals } from '@/hooks/useManagerApprovals'
import { LeaveApprovalCard } from '@/components/features/manager/LeaveApprovalCard'
import { cn } from '@/lib/utils/cn'

export default function ManagerApprovalsPage() {
  const {
    approvals,
    isLoading,
    filter,
    setFilter,
    selectedLeave,
    setSelectedLeave,
    approveDialogOpen,
    setApproveDialogOpen,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectionReason,
    setRejectionReason,
    approvalReason,
    setApprovalReason,
    handleAction,
    isProcessing,
  } = useManagerApprovals()

  const filters: { label: string; value: typeof filter }[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'All Requests', value: 'ALL' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6"
    >
      <PageHeader
        title="Team Approvals"
        description="Review and act on pending leave requests from your team members."
        badge={approvals.length}
      />

      <FilterTabs active={filter} options={filters} onChange={setFilter} />

      {isLoading ? (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl overflow-hidden shadow-sm">
          <TableSkeleton />
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState 
          icon="✨" 
          title="All caught up!" 
          description={filter === 'PENDING' ? "No pending approvals found. Your team is set." : "No records found for this filter."} 
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {approvals.map((leave) => (
            <LeaveApprovalCard
              key={leave.id}
              leave={leave}
              onApprove={() => {
                setSelectedLeave(leave)
                setApproveDialogOpen(true)
              }}
              onReject={() => {
                setSelectedLeave(leave)
                setRejectDialogOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <ConfirmDialog
        isOpen={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={() =>
          selectedLeave &&
          handleAction({ id: selectedLeave.id, action: 'approve', reason: approvalReason })
        }
        title="Approve Request"
        description={`Are you sure you want to approve leave for ${selectedLeave?.employee?.displayName}?`}
        confirmLabel="Approve"
        isLoading={isProcessing}
      >
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Internal Comments (Optional)
          </label>
          <textarea
            value={approvalReason}
            onChange={(e) => setApprovalReason(e.target.value)}
            rows={3}
            placeholder="Add any context for this approval..."
            className="w-full bg-slate-50 border border-[var(--color-card-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-heading)] outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
          />
        </div>
      </ConfirmDialog>

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false)
          setRejectionReason('')
        }}
        onConfirm={() =>
          selectedLeave &&
          handleAction({ id: selectedLeave.id, action: 'reject', reason: rejectionReason })
        }
        title="Reject Request"
        description={`Please provide a reason for rejecting leave for ${selectedLeave?.employee?.displayName}.`}
        confirmLabel="Reject"
        variant="danger"
        isLoading={isProcessing}
      >
        <div className="mt-4">
          <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-2 ml-1">
            Reason for Rejection *
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="The employee will see this reason..."
            className="w-full bg-red-50/30 border border-red-100 rounded-xl px-4 py-3 text-sm text-[var(--color-heading)] outline-none focus:ring-2 focus:ring-red-500/20 resize-none transition-all"
          />
        </div>
      </ConfirmDialog>
    </motion.div>
  )
}

function FilterTabs({ active, options, onChange }: { active: string, options: { label: string; value: string }[], onChange: (v: any) => void }) {
  return (
    <div className="flex items-center gap-2 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-1.5 w-fit shadow-sm">
      {options.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-bold transition-all",
            active === f.value
              ? "bg-blue-600 text-white shadow-md shadow-blue-100"
              : "text-[var(--color-muted)] hover:text-[var(--color-heading)] hover:bg-slate-50"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

