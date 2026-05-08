'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { format, parseISO, isToday, isBefore } from 'date-fns'
import toast from 'react-hot-toast'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import type { LeaveRequest } from '@/types/leave'

interface MyLeavesViewProps {
  role: 'EMPLOYEE' | 'MANAGER' | 'HR'
  initialLeaves?: LeaveRequest[]
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const

export function MyLeavesView({ role, initialLeaves }: MyLeavesViewProps) {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const { data: currentUserData } = useCurrentUser()
  const [filter, setFilter] = useState<string>('ALL')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const { data: response, isLoading } = useQuery<{ data: LeaveRequest[], total: number }>({
    queryKey: ['myLeaves', 'self', filter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/requests?userId=${currentUserData?.user.id}&status=${filter}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (!res.ok) throw new Error('Failed to fetch leaves')
      return res.json()
    },
  })

  const leaves = response?.data ?? []

  const { data: contactEmails = [] } = useQuery<{ email: string; displayName: string }[]>({
    queryKey: ['contactEmails', role],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const endpoint = role === 'EMPLOYEE' ? '/api/hr/contact' : '/api/hr/contact'
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/requests/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to cancel leave')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request cancelled successfully.')
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      queryClient.invalidateQueries({ queryKey: ['myLeaves', 'self'] })
      setCancelingId(null)
    },
  })

  const filteredLeaves = leaves
    .filter((l) => {
      if (filter === 'ALL') return l.status !== 'REVOKED'
      return l.status === filter
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  function getCancelAction(leave: LeaveRequest) {
    if (leave.status !== 'APPROVED' && leave.status !== 'PENDING') return null

    const startDate = parseISO(leave.startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const leaveDate = new Date(startDate)
    leaveDate.setHours(0, 0, 0, 0)

    // Allow employees to cancel requests if the status is PENDING (regardless of date)
    if (leave.status === 'PENDING') return 'cancel'

    // Allow employees to cancel requests if status is APPROVED AND start date is in the future
    if (leave.status === 'APPROVED') {
      if (leaveDate > today) {
        return 'cancel'
      } else {
        // If the start date is TODAY or in the PAST, and the status is APPROVED — hide the cancel button and show text 'Contact HR to reverse this leave'
        return 'contact_hr'
      }
    }

    return null
  }

  const contactEmailStr = contactEmails.map((c) => c.email).join(';')
  const user = currentUserData?.user

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading leaves...</div>
      ) : filteredLeaves.length === 0 ? (
        <EmptyState icon="🗓️" title="No leaves found" description="No leave requests match the selected filter." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredLeaves.map((leave, i) => {
              const action = getCancelAction(leave)
              return (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900 text-sm">{leave.title || 'Leave Request'}</p>
                        {leave.isEmergency && (
                          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">Emergency</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(parseISO(leave.startDate), 'dd MMM yyyy')} 
                        {leave.startHalfDay === 'HALF_DAY' && <span className="text-blue-500 font-medium ml-1">(Half Day)</span>}
                        {' → '}
                        {format(parseISO(leave.endDate), 'dd MMM yyyy')}
                        {leave.endHalfDay === 'HALF_DAY' && <span className="text-blue-500 font-medium ml-1">(Half Day)</span>}
                        {' · '}{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                        {Array.isArray(leave.dayOverrides) && leave.dayOverrides.length > 0 && (
                          <span className="text-blue-500 block mt-0.5">
                            Half days: {leave.dayOverrides.filter((o: any) => o.type === 'half').map((o: any) => format(parseISO(o.date), 'dd MMM')).join(', ')}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{leave.reason}</p>
                      {leave.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">Rejection reason: {leave.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <LeaveStatusBadge status={leave.status} />
                    </div>
                  </div>

                  {/* Cancel actions */}
                  {action && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {action === 'cancel' && (
                        <button
                          onClick={() => setCancelingId(leave.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          Cancel Leave
                        </button>
                      )}
                      {action === 'contact_hr' && (
                        <p className="text-xs text-slate-400 italic">
                          {role === 'EMPLOYEE'
                            ? 'Contact HR to reverse this leave'
                            : 'Contact Admin to reverse this leave'}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelingId}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel this leave request? This action cannot be undone."
        confirmLabel="Cancel Leave"
        cancelLabel="Keep"
        onConfirm={() => cancelingId && cancelMutation.mutate(cancelingId)}
        onClose={() => setCancelingId(null)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}
