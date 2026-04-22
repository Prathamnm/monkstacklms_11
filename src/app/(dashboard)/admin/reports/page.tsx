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
      className="p-4 lg:p-6 space-y-4"
    >
      <PageHeader title="Reports" description="System-wide leave and usage analytics." />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Leave Overview' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Leave Overview</h3>
          <p className="text-xs text-slate-400 mb-4">
            <span className="text-amber-600 font-medium">{pending} Pending</span>
            {' · '}
            <span className="text-green-600 font-medium">{approved} Approved</span>
            {' · '}
            <span className="text-red-600 font-medium">{rejected} Rejected</span>
          </p>
          {allLeaves.length === 0 ? (
            <p className="text-sm text-slate-500">No leave data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="py-3 pr-4 font-medium">Employee</th>
                    <th className="py-3 pr-4 font-medium">Period</th>
                    <th className="py-3 pr-4 font-medium">Days</th>
                    <th className="py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allLeaves.slice(0, 20).map((leave: any) => (
                    <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {leave.employee?.displayName ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{leave.totalDays}</td>
                      <td className="py-3"><LeaveStatusBadge status={leave.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'System Usage' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">System Usage</h3>
          <p className="text-xs text-slate-400 mb-4">User login frequency — last 30 days (based on audit events)</p>
          {usageList.length === 0 ? (
            <p className="text-sm text-slate-500">No audit activity in the last 30 days.</p>
          ) : (
            <div className="space-y-3">
              {usageList.map((user, i) => {
                const maxCount = usageList[0]?.count ?? 1
                const pct = Math.round((user.count / maxCount) * 100)
                return (
                  <div key={user.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">{user.name}</span>
                      <span className="text-slate-500">{user.count} actions</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full bg-blue-500 rounded-full"
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
