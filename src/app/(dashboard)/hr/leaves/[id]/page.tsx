'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { getInitials } from '@/lib/utils/formatters'
import type { LeaveRequest } from '@/types/leave'

export default function HRLeaveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revocationReason, setRevocationReason] = useState('')

  const { data: leave, isLoading } = useQuery<LeaveRequest>({
    queryKey: ['hrLeave', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/leaves/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load leave')
      return res.json()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/leaves/${id}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: revocationReason }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to revoke leave')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave revoked')
      queryClient.invalidateQueries({ queryKey: ['hrLeave', id] })
      queryClient.invalidateQueries({ queryKey: ['hrLeaves'] })
      setRevokeOpen(false)
      setRevocationReason('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageSkeleton />
  if (!leave) return null

  return (
    <div className="p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Leaves
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Leave details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 font-semibold text-lg">Leave Details</h2>
              <LeaveStatusBadge status={leave.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Period', value: formatDateRange(leave.startDate, leave.endDate) },
                { label: 'Duration', value: `${leave.totalDays} days` },
                { label: 'Submitted', value: format(parseISO(leave.createdAt), 'MMM d, yyyy') },
                { label: 'Approver', value: leave.approver?.displayName ?? '—' },
                { label: 'Approved At', value: leave.approvedAt ? format(parseISO(leave.approvedAt), 'MMM d, yyyy') : '—' },
                { label: 'Rejected At', value: leave.rejectedAt ? format(parseISO(leave.rejectedAt), 'MMM d, yyyy') : '—' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-0.5">{item.label}</p>
                  <p className="text-slate-900 text-sm">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Reason</p>
              <p className="text-slate-700 text-sm">{leave.reason}</p>
            </div>
            {leave.rejectionReason && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Rejection Reason</p>
                <p className="text-red-600 text-sm">{leave.rejectionReason}</p>
              </div>
            )}
            {leave.revocationReason && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Revocation Reason</p>
                <p className="text-purple-600 text-sm">{leave.revocationReason}</p>
              </div>
            )}
          </div>

          {/* HR Actions */}
          {leave.status === 'APPROVED' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-slate-900 font-semibold mb-3">HR Actions</h3>
              <button
                onClick={() => setRevokeOpen(true)}
                className="btn-danger"
              >
                Revoke Leave
              </button>
            </div>
          )}
        </div>

        {/* Employee card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 self-start">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {getInitials(leave.employee?.displayName ?? 'U')}
            </div>
            <div>
              <p className="text-slate-900 font-semibold">{leave.employee?.displayName}</p>
              <p className="text-slate-500 text-xs">{leave.employee?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={revokeOpen}
        onClose={() => { setRevokeOpen(false); setRevocationReason('') }}
        onConfirm={() => revokeMutation.mutate()}
        title="Revoke Leave"
        description="This will revoke the approved leave and restore the employee's balance."
        confirmLabel="Revoke"
        variant="danger"
        isLoading={revokeMutation.isPending}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Revocation Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={revocationReason}
            onChange={(e) => setRevocationReason(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="Reason for revoking..."
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
