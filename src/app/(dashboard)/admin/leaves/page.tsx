'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateRange, timeAgo } from '@/lib/utils/dateUtils'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInHours } from 'date-fns'
import type { LeaveRequest } from '@/types/leave'

const TABS = ['Escalated Cases', 'All Leaves'] as const
type Tab = typeof TABS[number]

export default function AdminLeavesPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Escalated Cases')
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

  // Escalated: status PENDING and created > 72 hours ago
  const escalated = leaves.filter(l => {
    if (l.status !== 'PENDING') return false
    const hours = differenceInHours(new Date(), new Date(l.createdAt))
    return hours > 72
  })

  const displayLeaves = activeTab === 'Escalated Cases' ? escalated : leaves

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
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Leave Approvals" description="Admin override capabilities for escalated or stuck leave requests." />

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200 px-4">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab}
              {tab === 'Escalated Cases' && escalated.length > 0 && (
                <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{escalated.length}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading leaves...</p>
        ) : displayLeaves.length === 0 ? (
          <EmptyState icon="📋" title={`No ${activeTab.toLowerCase()}`} description={activeTab === 'Escalated Cases' ? 'All pending requests are within SLAs.' : 'No leaves found.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-4 font-medium">Employee</th>
                  <th className="px-5 py-4 font-medium">Period</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Submitted</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{leave.employee?.displayName ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{leave.reason}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{formatDateRange(leave.startDate, leave.endDate)}</p>
                      <p className="text-xs text-slate-500">{leave.totalDays} day(s)</p>
                    </td>
                    <td className="px-5 py-4"><LeaveStatusBadge status={leave.status} /></td>
                    <td className="px-5 py-4">
                      <p className="text-slate-900 font-medium">{timeAgo(leave.createdAt)}</p>
                      <p className="text-xs text-slate-500">
                         {differenceInHours(new Date(), new Date(leave.createdAt))} hrs ago
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {leave.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Force {overrideTarget.action === 'approve' ? 'Approve' : 'Reject'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                You are about to administratively override the leave request for {overrideTarget.name}. 
                <span className="font-semibold text-red-600 block mt-1">This action requires a mandatory justification.</span>
              </p>
              
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Enter justification for admin override..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none mb-4"
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
