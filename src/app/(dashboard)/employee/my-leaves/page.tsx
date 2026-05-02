'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, isBefore } from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { LeaveRequest, LeaveStatus } from '@/types/leave'

export function EmployeeMyLeavesRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/employee/leave?tab=requests')
  }, [router])
  
  return null
}

type Tab = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
const TABS: Tab[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled']
const TAB_STATUS_MAP: Record<Tab, LeaveStatus | null> = {
  All: null,
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
  Cancelled: 'CANCELLED',
}
function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'APPROVED':  return { background: 'var(--status-approved-bg)',  color: 'var(--status-approved-text)' }
    case 'PENDING':   return { background: 'var(--status-pending-bg)',   color: 'var(--status-pending-text)' }
    case 'REJECTED':  return { background: 'var(--status-rejected-bg)',  color: 'var(--status-rejected-text)' }
    case 'CANCELLED': return { background: 'var(--status-cancelled-bg)', color: 'var(--status-cancelled-text)' }
    default:          return {}
  }
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export default function MyLeavesPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load leaves')
      const data = await res.json()
      console.log('[My Leaves] Fetched leaves:', data.length, 'data:', data)
      return data
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
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh' }}>
      <PageHeader title="My Leaves" description="Your leave history and balance" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <LeaveBalanceCard />

        {/* Filter tabs + cards wrapper */}
        <div style={{
          background: 'var(--color-card-bg)',
          border: '0.5px solid var(--color-card-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '14px 18px',
            borderBottom: '0.5px solid var(--color-card-border)',
            flexWrap: 'wrap',
          }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab
              const count = tab !== 'All' ? leaves.filter((l) => l.status === TAB_STATUS_MAP[tab]).length : null
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: isActive ? 'var(--icon-pill-blue-stroke)' : 'var(--color-card-bg)',
                    color: isActive ? 'var(--icon-pill-blue-bg)' : 'var(--color-muted)',
                    border: isActive ? 'none' : '0.5px solid var(--color-card-border)',
                    borderRadius: 99,
                    padding: '6px 18px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {tab}
                  {count !== null && count > 0 && (
                    <span style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--balance-track-bg)',
                      color: isActive ? '#fff' : 'var(--color-muted)',
                      fontSize: 10,
                      fontWeight: 500,
                      borderRadius: 99,
                      padding: '1px 6px',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Leave list */}
          {isLoading ? (
            <TableSkeleton />
          ) : filteredLeaves.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>No leave requests</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>You have no leave requests in this category.</p>
            </div>
          ) : (
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredLeaves.map((leave) => (
                <motion.div
                  key={leave.id}
                  layout
                  style={{
                    background: 'var(--color-card-bg)',
                    border: '0.5px solid var(--color-card-border)',
                    borderRadius: 12,
                    padding: '18px 22px',
                  }}
                >
                  {/* Top row: title + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-heading)' }}>
                      {leave.title || 'Leave Request'}
                      {leave.isEmergency && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 10,
                          background: 'var(--status-rejected-bg)',
                          color: 'var(--pill-emergency-text)',
                          padding: '2px 7px',
                          borderRadius: 99,
                          fontWeight: 500,
                          verticalAlign: 'middle',
                        }}>Emergency</span>
                      )}
                    </p>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '3px 10px',
                      borderRadius: 99,
                      flexShrink: 0,
                      marginLeft: 12,
                      ...statusBadgeStyle(leave.status),
                    }}>
                      {statusLabel(leave.status)}
                    </span>
                  </div>

                  {/* Date + duration row */}
                  <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 8 }}>
                    {formatDateRange(leave.startDate, leave.endDate)} · {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                  </p>

                  {/* Reason box */}
                  {leave.reason && (
                    <div style={{
                      fontSize: 13,
                      color: 'var(--color-heading)',
                      padding: '10px 12px',
                      background: 'var(--color-page-bg)',
                      borderRadius: 8,
                      border: '0.5px solid var(--color-card-border)',
                      marginBottom: 10,
                    }}>
                      {leave.reason}
                    </div>
                  )}

                  {/* Reviewer info */}
                  {leave.approver && (
                    <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 8 }}>
                      {leave.status === 'APPROVED' ? 'Approved' : 'Reviewed'} by {leave.approver.displayName} · {format(parseISO(leave.createdAt), 'dd MMM yyyy')}
                    </p>
                  )}

                  {/* Rejection reason */}
                  {leave.rejectionReason && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--status-rejected-text)',
                      padding: '8px 12px',
                      background: 'var(--status-rejected-bg)',
                      borderRadius: 8,
                      marginBottom: 10,
                    }}>
                      Rejection reason: {leave.rejectionReason}
                    </div>
                  )}

                  {/* Footer */}
                  {leave.status === 'APPROVED' && (
                    <p style={{
                      fontSize: 11,
                      color: 'var(--color-muted)',
                      fontStyle: 'italic',
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '0.5px solid var(--color-card-border)',
                    }}>
                      Contact HR to reverse this leave.
                    </p>
                  )}

                  {/* Cancel button */}
                  {canCancel(leave) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--color-card-border)' }}>
                      <button
                        onClick={() => setCancelId(leave.id)}
                        style={{
                          fontSize: 12,
                          color: 'var(--status-rejected-text)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: 500,
                        }}
                      >
                        Cancel this request
                      </button>
                    </div>
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
