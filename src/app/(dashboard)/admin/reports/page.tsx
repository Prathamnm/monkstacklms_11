'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { motion } from 'framer-motion'

const TABS = ['Leave Summary', 'System Usage'] as const
type Tab = typeof TABS[number]

export default function AdminReportsPage() {
  const { instance } = useMsal()
  const [activeTab, setActiveTab] = useState<Tab>('Leave Summary')

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

  const { data: leaveStats = [] } = useQuery({
    queryKey: ['adminLeaveStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/reports/leave-stats', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
    enabled: activeTab === 'Leave Summary',
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 lg:p-8 space-y-6"
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

      {activeTab === 'Leave Summary' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Leave Summary</h3>
          {leaveStats.length === 0 ? (
            <p className="text-sm text-slate-500">No leave data available for the current period.</p>
          ) : (
            <div className="space-y-2">
              {leaveStats.map((row: { label: string; value: number | string }, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                  <span className="text-slate-700">{row.label}</span>
                  <span className="font-semibold text-slate-900">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'System Usage' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
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
