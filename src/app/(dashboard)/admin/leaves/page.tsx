'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateRange, timeAgo } from '@/lib/utils/dateUtils'
import { format, parseISO } from 'date-fns'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { LeaveRequest } from '@/types/leave'

export default function AdminLeavesPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [overrideTarget, setOverrideTarget] = useState<{ id: string; action: 'approve' | 'reject'; name: string } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['adminAllLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load leaves')
      return res.json()
    },
  })

  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!overrideTarget) throw new Error('No target')
      if (!overrideReason.trim()) throw new Error('Reason is mandatory for admin overrides')

      const token = await getAccessToken(instance)
      const res = await fetch(`/api/admin/leaves/${overrideTarget.id}/override`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: overrideTarget.action, reason: overrideReason }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Override failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAllLeaves'] })
      setOverrideTarget(null)
      setOverrideReason('')
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader title="Leave Approvals" description="Admin override capabilities for all leave requests." />

      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading leaves...</p>
        ) : leaves.length === 0 ? (
          <EmptyState icon="📋" title="No leave requests" description="No leaves found." />
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-card-border)', background: 'var(--color-page-bg)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(leave => (
                  <tr key={leave.id} style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <p style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{leave.employee?.displayName ?? 'Unknown'}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, whiteSpace: 'nowrap' }}>{leave.reason}</p>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <p style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{formatDateRange(leave.startDate, leave.endDate)}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                        {leave.totalDays} day(s)
                        {leave.startHalfDay === 'HALF_DAY' && <span className="text-blue-500 ml-1">(S:1/2)</span>}
                        {leave.endHalfDay === 'HALF_DAY' && <span className="text-blue-500 ml-1">(E:1/2)</span>}
                        {Array.isArray(leave.dayOverrides) && leave.dayOverrides.length > 0 && (
                          <span className="text-blue-500 block text-[10px]">
                            {leave.dayOverrides.filter((o: any) => o.type === 'half').map((o: any) => format(parseISO(o.date), 'dd/MM')).join(', ')}
                          </span>
                        )}
                      </p>
                    </td>
                    <td style={{ padding: '12px 20px' }}><LeaveStatusBadge status={leave.status} /></td>
                    <td style={{ padding: '12px 20px' }}>
                      <p style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{timeAgo(leave.createdAt)}</p>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      {leave.status === 'PENDING' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => setOverrideTarget({ id: leave.id, action: 'approve', name: leave.employee?.displayName ?? '' })}
                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            Force Approve
                          </button>
                          <button onClick={() => setOverrideTarget({ id: leave.id, action: 'reject', name: leave.employee?.displayName ?? '' })}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            Force Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {overrideTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--color-card-bg)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 440, padding: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 8 }}>
                Force {overrideTarget.action === 'approve' ? 'Approve' : 'Reject'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16 }}>
                You are about to administratively override the leave request for {overrideTarget.name}.
                <span style={{ fontWeight: 600, color: 'var(--status-rejected-text)', display: 'block', marginTop: 4 }}>This action requires a mandatory justification.</span>
              </p>

              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Enter justification for admin override..."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', resize: 'none', outline: 'none', marginBottom: 16 }}
              />

              {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setOverrideTarget(null); setOverrideReason(''); setError(null) }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={() => overrideMutation.mutate()}
                  disabled={overrideMutation.isPending || !overrideReason.trim()}
                  className={`rounded-xl text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    overrideTarget.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {overrideMutation.isPending ? 'Processing...' : `Confirm ${overrideTarget.action === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
