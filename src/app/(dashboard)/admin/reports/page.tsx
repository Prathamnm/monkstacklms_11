'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { motion } from 'framer-motion'

const TABS = ['Leave Overview', 'System Usage'] as const
type Tab = typeof TABS[number]

export default function AdminReportsPage() {
  const { instance } = useMsal()
  const [activeTab, setActiveTab] = useState<Tab>('Leave Overview')

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['adminAuditLogs', 'systemUsage'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/audit?limit=50', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
    enabled: activeTab === 'System Usage',
  })

  const { data: allLeaves = [] } = useQuery({
    queryKey: ['adminLeaveOverview'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/leaves', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
    enabled: activeTab === 'Leave Overview',
  })

  // Group system usage by actor from audit logs (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const usageByActor = auditLogs
    .filter((log: { createdAt: string }) => new Date(log.createdAt) >= thirtyDaysAgo)
    .reduce((acc: Record<string, { name: string; count: number }>, log: { performer?: { displayName: string }; performedBy: string }) => {
      const actorName = log.performer?.displayName ?? log.performedBy
      if (!acc[actorName]) acc[actorName] = { name: actorName, count: 0 }
      acc[actorName].count++
      return acc
    }, {})

  const usageList = Object.values(usageByActor as Record<string, { name: string; count: number }>)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Leave overview counts
  const pending = allLeaves.filter((l: any) => l.status === 'PENDING').length
  const approved = allLeaves.filter((l: any) => l.status === 'APPROVED').length
  const rejected = allLeaves.filter((l: any) => l.status === 'REJECTED').length

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <PageHeader title="Reports" description="System-wide leave and usage analytics." />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--color-card-border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 20px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === tab ? 'var(--color-card-bg)' : 'transparent',
              color: activeTab === tab ? 'var(--color-heading)' : 'var(--color-muted)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Leave Overview' && (
        <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 4 }}>Leave Overview</h3>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 16 }}>
            <span style={{ color: '#BA7517', fontWeight: 500 }}>{pending} Pending</span>
            {' · '}
            <span style={{ color: 'var(--icon-pill-green-stroke)', fontWeight: 500 }}>{approved} Approved</span>
            {' · '}
            <span style={{ color: 'var(--status-rejected-text)', fontWeight: 500 }}>{rejected} Rejected</span>
          </p>
          {allLeaves.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>No leave data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--color-card-border)', background: 'var(--color-page-bg)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px 10px 0', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px 10px 0', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px 10px 0', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</th>
                    <th style={{ textAlign: 'left', padding: '10px 0', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allLeaves.slice(0, 20).map((leave: any) => (
                    <tr key={leave.id} style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                      <td style={{ padding: '11px 16px 11px 0', fontWeight: 500, color: 'var(--color-heading)' }}>
                        {leave.employee?.displayName ?? '—'}
                      </td>
                      <td style={{ padding: '11px 16px 11px 0', color: 'var(--color-muted)' }}>
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </td>
                      <td style={{ padding: '11px 16px 11px 0', color: 'var(--color-muted)' }}>{leave.totalDays}</td>
                      <td style={{ padding: '11px 0' }}><LeaveStatusBadge status={leave.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'System Usage' && (
        <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 4 }}>System Usage</h3>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 16 }}>User login frequency — last 30 days (based on audit events)</p>
          {usageList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>No audit activity in the last 30 days.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {usageList.map((user, i) => {
                const maxCount = usageList[0]?.count ?? 1
                const pct = Math.round((user.count / maxCount) * 100)
                return (
                  <div key={user.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{user.name}</span>
                      <span style={{ color: 'var(--color-muted)' }}>{user.count} actions</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-card-border)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        style={{ height: '100%', background: 'var(--icon-pill-blue-stroke)', borderRadius: 99 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
