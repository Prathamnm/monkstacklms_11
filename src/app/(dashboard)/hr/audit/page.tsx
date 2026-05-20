'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Clock, User, Shield, Activity, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { getInitials } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
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
  LEAVE_APPROVE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  LEAVE_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  LEAVE_REJECT: 'bg-red-50 text-red-700 border-red-100',
  LEAVE_REJECTED: 'bg-red-50 text-red-700 border-red-100',
  LEAVE_REVOKE: 'bg-purple-50 text-purple-700 border-purple-100',
  LEAVE_REVOKED: 'bg-purple-50 text-purple-700 border-purple-100',
  ACCRUAL_RUN: 'bg-blue-50 text-blue-700 border-blue-100',
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
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader 
        title="System Audit Log" 
        description="Monitor system-wide actions and historical modifications for security compliance" 
        badge={logs.length} 
      />

      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-fit">
        <div className="flex items-center gap-2 px-3 text-slate-400 border-r border-slate-200 mr-1">
          <Filter size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Filter Action</span>
        </div>
        <select 
          value={actionFilter} 
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:text-blue-600 transition-colors pr-2"
        >
          <option value="">All Activities</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[140px_160px_1fr_1fr_60px] gap-4 px-6 py-4 bg-slate-50/80 border-b border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Clock size={12} />
            Timestamp
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Activity size={12} />
            Action
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <User size={12} />
            Performed By
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Shield size={12} />
            Target
          </div>
          <div></div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-sm font-bold text-red-600 uppercase tracking-widest mb-2">Error loading audit logs</p>
            <p className="text-xs text-slate-400 font-medium">Please refresh the page or contact support.</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon="📜" title="No audit logs found" description="No system activity matches your filter." />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="group">
                <div
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className={cn(
                    "grid grid-cols-[140px_160px_1fr_1fr_60px] gap-4 px-6 py-4 items-center cursor-pointer transition-all",
                    expandedId === log.id ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                  )}
                >
                  <span className="text-[12px] font-bold text-slate-400 whitespace-nowrap">
                    {format(log.createdAt, 'MMM d, HH:mm:ss')}
                  </span>
                  <div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight border",
                      ACTION_COLORS[log.action] ?? 'bg-slate-50 text-slate-600 border-slate-100'
                    )}>
                      {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-[11px] font-bold shrink-0 group-hover:scale-105 transition-transform">
                      {log.performer?.displayName ? getInitials(log.performer.displayName) : '?'}
                    </div>
                    <span className="text-[13px] font-bold text-slate-900 truncate">
                      {log.performer?.displayName ?? (log.performedBy.length > 20 ? 'System / Deleted' : log.performedBy)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    {log.target ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 text-[11px] font-bold shrink-0">
                          {getInitials(log.target.displayName)}
                        </div>
                        <span className="text-[13px] font-medium text-slate-500 truncate">
                          {log.target.displayName}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Global System</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <div className="w-8 h-8 rounded-lg bg-slate-100/50 group-hover:bg-white flex items-center justify-center transition-colors">
                      {expandedId === log.id ? (
                        <ChevronUp size={16} className="text-blue-600" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedId === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
                  >
                    <div className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                      <div className="xl:col-span-2 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                          <Activity size={14} className="text-blue-500" />
                          Activity Parameters
                        </h4>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-inner">
                          <pre className="text-xs font-mono text-slate-600 leading-relaxed overflow-auto max-h-[400px] scrollbar-hide">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                            <Shield size={14} className="text-blue-500" />
                            System Context
                          </h4>
                          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">IP Address</span>
                              <span className="text-[12px] font-bold text-slate-900">{log.ipAddress || 'Not recorded'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Log Identifier</span>
                              <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{log.id.slice(0, 16)}</span>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">User Agent</span>
                              <p className="text-[11px] font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed" title={log.userAgent ?? undefined}>
                                {log.userAgent || 'No browser metadata'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
