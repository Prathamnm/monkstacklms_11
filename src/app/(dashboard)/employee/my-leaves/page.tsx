'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useMyLeaves } from '@/hooks/useMyLeaves'
import { LeaveRequestCard } from '@/components/features/employee/LeaveRequestCard'
import type { LeaveStatus } from '@/types/leave'
import { cn } from '@/lib/utils/cn'

type Tab = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
const TABS: Tab[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled']
const TAB_STATUS_MAP: Record<Tab, LeaveStatus | null> = {
  All: null,
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
  Cancelled: 'CANCELLED',
}

export default function MyLeavesPage() {
  const { leaves, isLoading, cancelLeave } = useMyLeaves()
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [cancelId, setCancelId] = useState<string | null>(null)

  const statusFilter = TAB_STATUS_MAP[activeTab]
  const filteredLeaves = statusFilter
    ? leaves.filter((l) => l.status === statusFilter)
    : leaves

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen">
      <PageHeader title="My Leaves" description="Your leave history and balance" />

      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <LeaveBalanceCard />

        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex gap-2 p-4 border-b border-[var(--color-card-border)] overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const isActive = activeTab === tab
              const count = tab !== 'All' ? leaves.filter((l) => l.status === TAB_STATUS_MAP[tab]).length : 0
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-page-bg)] border border-[var(--color-card-border)]"
                  )}
                >
                  {tab}
                  {count > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-white/20 text-white" : "bg-[var(--balance-track-bg)] text-[var(--color-muted)]"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <TableSkeleton />
            ) : filteredLeaves.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-base font-medium text-[var(--color-heading)] mb-1">No leave requests</p>
                <p className="text-sm text-[var(--color-muted)]">You have no leave requests in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredLeaves.map((leave) => (
                  <LeaveRequestCard
                    key={leave.id}
                    leave={leave}
                    onCancel={setCancelId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelId && cancelLeave.mutate(cancelId, { onSuccess: () => setCancelId(null) })}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel this leave request? This action cannot be undone."
        confirmLabel="Cancel Leave"
        variant="danger"
        isLoading={cancelLeave.isPending}
      />
    </div>
  )
}
