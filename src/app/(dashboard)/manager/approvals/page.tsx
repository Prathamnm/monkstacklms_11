'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { AvatarInitials } from '@/components/shared/managerDesignSystem'
import { getInitials, formatDays } from '@/lib/utils/formatters'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { LeaveRequest } from '@/types/leave'

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export default function ManagerApprovalsPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()

  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalReason, setApprovalReason] = useState('')
  const [filter, setFilter] = useState<Filter>('PENDING')

  const { data: approvals = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['managerApprovals', filter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/approvals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load approvals')
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    if (filter === 'ALL') return approvals
    return approvals.filter((a) => a.status === filter)
  }, [approvals, filter])

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
      queryClient.invalidateQueries({ queryKey: ['teamLeaveOverview'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
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

  const filterPillStyle = (active: boolean): React.CSSProperties =>
    active
      ? {
          background: 'var(--icon-pill-blue-stroke)',
          color: 'var(--icon-pill-blue-bg)',
          borderRadius: 99,
          padding: '4px 14px',
          fontSize: 12,
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
        }
      : {
          background: 'var(--color-page-bg)',
          color: 'var(--color-muted)',
          border: '0.5px solid var(--color-card-border)',
          borderRadius: 99,
          padding: '4px 14px',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }

  return (
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="Approvals"
        description="Review and act on pending leave requests"
        badge={approvals.length}
      />

      <div
        style={{
          background: 'var(--color-card-bg)',
          border: '0.5px solid var(--color-card-border)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setFilter(k)} style={filterPillStyle(filter === k)}>
            {k === 'ALL' ? 'All' : k === 'PENDING' ? 'Pending' : k === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '0.5px solid var(--color-card-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <TableSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '0.5px solid var(--color-card-border)',
            borderRadius: 12,
          }}
        >
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'var(--status-approved-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--icon-pill-green-stroke)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>No pending approvals</p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Your team is all caught up</p>
          </div>
        </div>
      ) : (
        <div className="space-y-[10px]">
          {filtered.map((leave) => (
            <div
              key={leave.id}
              style={{
                background: 'var(--color-card-bg)',
                border: '0.5px solid var(--color-card-border)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarInitials size="md" variant={0} initials={getInitials(leave.employee?.displayName ?? 'U')} />
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)' }}>
                    {leave.employee?.displayName ?? 'Employee'}
                  </p>
                  <p className="truncate" style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                    {formatDateRange(leave.startDate, leave.endDate)}
                    {leave.startHalfDay === 'HALF_DAY' && <span className="text-blue-500 font-medium ml-1">(S: Half)</span>}
                    {leave.endHalfDay === 'HALF_DAY' && <span className="text-blue-500 font-medium ml-1">(E: Half)</span>}
                    {' · '}{formatDays(leave.totalDays)}
                    {Array.isArray(leave.dayOverrides) && leave.dayOverrides.length > 0 && (
                      <span className="text-blue-500 block">
                        Toggled: {leave.dayOverrides.filter((o: any) => o.type === 'half').map((o: any) => format(parseISO(o.date), 'dd MMM')).join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <LeaveStatusBadge status={leave.status} />

                {leave.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeave(leave)
                        setRejectDialogOpen(true)
                      }}
                      style={{
                        background: 'var(--status-rejected-bg)',
                        color: 'var(--status-rejected-text)',
                        border: '0.5px solid #F7C1C1',
                        borderRadius: 8,
                        padding: '5px 14px',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeave(leave)
                        setApproveDialogOpen(true)
                      }}
                      style={{
                        background: 'var(--status-approved-bg)',
                        color: 'var(--status-approved-text)',
                        border: '0.5px solid #C0DD97',
                        borderRadius: 8,
                        padding: '5px 14px',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Check size={14} /> Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
          <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-heading)' }}>
            Comments (Optional)
          </label>
          <textarea
            value={approvalReason}
            onChange={(e) => setApprovalReason(e.target.value)}
            rows={3}
            className="w-full outline-none"
            style={{
              border: '0.5px solid var(--color-card-border)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--color-heading)',
              background: 'var(--color-card-bg)',
            }}
            placeholder="Add any internal comments or notes..."
          />
        </div>
      </ConfirmDialog>

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
          <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-heading)' }}>
            Reason for rejection <span style={{ color: 'var(--status-rejected-text)' }}>*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            className="w-full outline-none"
            style={{
              border: '0.5px solid var(--color-card-border)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--color-heading)',
              background: 'var(--color-card-bg)',
            }}
            placeholder="Please provide a reason..."
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}

