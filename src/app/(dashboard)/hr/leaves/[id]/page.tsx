'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { getInitials } from '@/lib/utils/formatters'
import type { LeaveRequest } from '@/types/leave'

export default function HRLeaveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()

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

  if (isLoading) return <PageSkeleton />
  if (!leave) return null

  return (
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Leaves
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 24 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-heading)' }}>Leave Details</h2>
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
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--color-card-border)' }}>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Reason</p>
              <p style={{ fontSize: 14, color: 'var(--color-heading)' }}>{leave.reason}</p>
            </div>
            {leave.rejectionReason && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--color-card-border)' }}>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Rejection Reason</p>
                <p className="text-red-600 text-sm">{leave.rejectionReason}</p>
              </div>
            )}
            {leave.revocationReason && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--color-card-border)' }}>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Revocation Reason</p>
                <p className="text-purple-600 text-sm">{leave.revocationReason}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 20, alignSelf: 'flex-start' }}>
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
    </div>
  )
}
