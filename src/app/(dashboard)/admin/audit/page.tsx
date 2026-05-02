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

export default function AdminAuditPage() {
  const { instance } = useMsal()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs', actionFilter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const params = actionFilter ? `?action=${actionFilter}` : ''
      const res = await fetch(`/api/admin/audit${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load audit logs')
      return res.json()
    },
  })

  return (
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader title="Audit Log" description="Complete audit trail of all system actions" badge={logs.length} />

      <div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}>
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon="📜" title="No audit logs found" />
        ) : (
          <div>
            {logs.map((log) => (
              <div key={log.id} style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {format(parseISO(log.createdAt), 'MMM d, HH:mm')}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-heading)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.performer?.displayName ?? log.performedBy}
                  </span>
                  {log.target && (
                    <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                      → {log.target.displayName}
                    </span>
                  )}
                  {expandedId === log.id ? (
                    <ChevronUp size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  ) : (
                    <ChevronDown size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  )}
                </div>
                {expandedId === log.id && (
                  <div style={{ padding: '12px 20px', background: 'var(--color-page-bg)', borderTop: '0.5px solid var(--color-card-border)' }}>
                    <pre style={{ fontSize: 12, color: 'var(--color-heading)', overflow: 'auto', maxHeight: 160, background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 8, padding: 12 }}>
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
