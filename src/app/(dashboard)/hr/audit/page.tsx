'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { AuditLog } from '@/types/api'

const ACTION_LABELS: Record<string, string> = {
  LEAVE_APPLY: 'Leave Applied',
  LEAVE_APPROVE: 'Leave Approved',
  LEAVE_REJECT: 'Leave Rejected',
  LEAVE_CANCEL: 'Leave Cancelled',
  LEAVE_REVOKE: 'Leave Revoked',
  BALANCE_ADJUST: 'Balance Adjusted',
  ACCRUAL_RUN: 'Accrual Run',
}

const ACTION_COLORS: Record<string, string> = {
  LEAVE_APPROVE: 'bg-green-50 text-green-700',
  LEAVE_REJECT: 'bg-red-50 text-red-700',
  LEAVE_REVOKE: 'bg-purple-50 text-purple-700',
  ACCRUAL_RUN: 'bg-teal-50 text-teal-700',
}

export default function HRAuditPage() {
  const { instance } = useMsal()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['hrAuditLogs', actionFilter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const params = actionFilter ? `?action=${actionFilter}` : ''
      const res = await fetch(`/api/hr/audit${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load audit logs')
      return res.json()
    },
  })

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader title="Audit Log" description="Complete audit trail of all system actions" badge={logs.length} />

      <div className="mb-4">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input">
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon="📜" title="No audit logs found" />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <span className="text-slate-400 text-xs whitespace-nowrap">
                    {format(parseISO(log.createdAt), 'MMM d, HH:mm')}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="text-slate-700 text-sm flex-1 truncate">
                    {log.performer?.displayName ?? log.performedBy}
                  </span>
                  {log.target && (
                    <span className="text-slate-500 text-sm hidden md:block">
                      {'->'} {log.target.displayName}
                    </span>
                  )}
                  {expandedId === log.id ? (
                    <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                  )}
                </div>
                {expandedId === log.id && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                    <pre className="text-xs text-slate-600 overflow-auto max-h-40 bg-white border border-slate-200 rounded p-3">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
