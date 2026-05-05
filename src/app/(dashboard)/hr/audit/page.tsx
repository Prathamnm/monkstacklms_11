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
import { getInitials } from '@/lib/utils/formatters'
import type { AuditLog } from '@/types/api'

const ACTION_LABELS: Record<string, string> = {
  LEAVE_APPLY: 'Leave Applied',
  LEAVE_APPROVE: 'Leave Approved',
  LEAVE_APPROVED: 'Leave Approved',
  LEAVE_REJECT: 'Leave Rejected',
  LEAVE_REJECTED: 'Leave Rejected',
  LEAVE_CANCEL: 'Leave Cancelled',
  LEAVE_CANCELLED: 'Leave Cancelled',
  LEAVE_REVOKE: 'Leave Revoked',
  LEAVE_REVOKED: 'Leave Revoked',
  BALANCE_ADJUST: 'Balance Adjusted',
  ACCRUAL_RUN: 'Accrual Run',
}

const ACTION_COLORS: Record<string, string> = {
  LEAVE_APPROVE: 'bg-green-50 text-green-700',
  LEAVE_APPROVED: 'bg-green-50 text-green-700',
  LEAVE_REJECT: 'bg-red-50 text-red-700',
  LEAVE_REJECTED: 'bg-red-50 text-red-700',
  LEAVE_REVOKE: 'bg-purple-50 text-purple-700',
  LEAVE_REVOKED: 'bg-purple-50 text-purple-700',
  ACCRUAL_RUN: 'bg-teal-50 text-teal-700',
}

export default function AdminAuditPage() {
  const { instance } = useMsal()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')

  const { data: logs = [], isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs', actionFilter],
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
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr 1fr 40px', gap: 16, padding: '12px 20px', background: 'var(--color-page-bg)', borderBottom: '0.5px solid var(--color-card-border)', fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div>Timestamp</div>
          <div>Action</div>
          <div>Performed By</div>
          <div>Target</div>
          <div></div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : (error as any) ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
            <p style={{ fontSize: 16, color: '#DC2626', fontWeight: 600 }}>Error loading logs</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>{(error as any)?.message || 'An unexpected error occurred'}</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon="📜" title="No audit logs found" />
        ) : (
          <div>
            {logs.map((log) => (
              <div key={log.id} style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr 1fr 40px', gap: 16, padding: '14px 20px', cursor: 'pointer', alignItems: 'center' }}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {format(parseISO(log.createdAt), 'MMM d, HH:mm')}
                  </span>
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--balance-track-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-heading)', flexShrink: 0 }}>
                      {log.performer?.displayName ? getInitials(log.performer.displayName) : '?'}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--color-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.performer?.displayName ?? (log.performedBy.length > 20 ? 'System / Deleted User' : log.performedBy)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    {log.target ? (
                      <>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', flexShrink: 0, border: '0.5px solid var(--color-card-border)' }}>
                          {getInitials(log.target.displayName)}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.target.displayName}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic' }}>General System</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {expandedId === log.id ? (
                      <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />
                    )}
                  </div>
                </div>
                {expandedId === log.id && (
                  <div style={{ padding: '16px 20px', background: 'var(--color-page-bg)', borderTop: '0.5px solid var(--color-card-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Log Details</p>
                        <pre style={{ fontSize: 12, color: 'var(--color-heading)', overflow: 'auto', maxHeight: 300, background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: 16, lineHeight: 1.5 }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                      <div style={{ background: 'var(--color-card-bg)', borderRadius: 10, padding: 16, border: '0.5px solid var(--color-card-border)' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Metadata</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Log ID</span>
                            <span style={{ fontSize: 12, color: 'var(--color-heading)', fontFamily: 'monospace' }}>{log.id}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>IP Address</span>
                            <span style={{ fontSize: 12, color: 'var(--color-heading)' }}>{log.ipAddress || 'Not recorded'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>User Agent</span>
                            <span style={{ fontSize: 12, color: 'var(--color-heading)', maxWidth: 200, truncate: true }} title={log.userAgent ?? undefined}>{log.userAgent ? (log.userAgent.length > 30 ? log.userAgent.substring(0, 30) + '...' : log.userAgent) : 'Not recorded'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
