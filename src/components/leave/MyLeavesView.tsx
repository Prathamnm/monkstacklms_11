'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { format, parseISO, isToday, isBefore } from 'date-fns'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import type { LeaveRequest } from '@/types/leave'

interface MyLeavesViewProps {
  role: 'EMPLOYEE' | 'MANAGER' | 'HR'
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const

export function MyLeavesView({ role }: MyLeavesViewProps) {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const { data: currentUserData } = useCurrentUser()
  const [filter, setFilter] = useState<string>('ALL')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const leavesApiMap: Record<string, string> = {
    EMPLOYEE: '/api/employee/leaves',
    MANAGER: '/api/employee/leaves',
    HR: '/api/employee/leaves',
  }

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaves', role],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(leavesApiMap[role], { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch leaves')
      return res.json()
    },
  })

  const { data: contactEmails = [], isLoading: contactLoading } = useQuery<{ email: string; displayName: string }[]>({
    queryKey: ['contactEmails', role],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const endpoint = role === 'EMPLOYEE' ? '/api/hr/contact' : '/api/admin/contact'
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/cancel/${leaveId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to cancel leave')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      setCancelingId(null)
    },
  })

  const filteredLeaves = leaves
    .filter((l) => filter === 'ALL' || l.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  function getCancelAction(leave: LeaveRequest) {
    const startDate = parseISO(leave.startDate)
    const todayStr = new Date().toDateString()
    const startStr = startDate.toDateString()
    const isStarted = isBefore(startDate, new Date()) && startStr !== todayStr

    if (leave.status !== 'APPROVED' && leave.status !== 'PENDING') return null

    if (isStarted && leave.status === 'APPROVED') return 'contact_hr'
    if (isToday(startDate) && leave.status === 'APPROVED') return 'on_day_cancel'
    if (isBefore(new Date(), startDate) || startStr === todayStr) {
      if (leave.status === 'PENDING') return 'cancel'
      if (leave.status === 'APPROVED' && !isToday(startDate)) return 'cancel'
    }
    return null
  }

  const contactEmailStr = contactEmails.map((c) => c.email).join(';')
  const user = currentUserData?.user

  return (
    <div className="space-y-6">
      {currentUserData?.balance && (
        <LeaveBalanceCard />
      )}

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
                        {format(parseISO(leave.startDate), 'dd MMM yyyy')} → {format(parseISO(leave.endDate), 'dd MMM yyyy')}
                        {' · '}{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
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
                      {action === 'on_day_cancel' && contactEmailStr && (
                        <a
                          href={`mailto:${contactEmailStr}?subject=Leave Cancellation Request - ${user?.displayName ?? ''} ${format(parseISO(leave.startDate), 'dd MMM yyyy')}&body=Hi,%0A%0AI would like to request cancellation of my leave on ${format(parseISO(leave.startDate), 'dd MMM yyyy')}.%0A%0ARegards,%0A${user?.displayName ?? ''}`}
                          className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg font-medium hover:bg-yellow-100 transition-colors inline-block"
                        >
                          Request On-Day Cancellation
                        </a>
                      )}
                      {action === 'contact_hr' && (
                        <p className="text-xs text-slate-400 italic">Contact HR to reverse this leave</p>
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
