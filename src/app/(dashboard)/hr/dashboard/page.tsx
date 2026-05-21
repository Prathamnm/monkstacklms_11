'use client'

import { motion } from 'framer-motion'
import { Activity, Shield } from 'lucide-react'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { useHRStats, useAuditLogs } from '@/hooks/useHRDashboardData'
import { HRWelcomeBanner } from '@/components/features/hr/HRWelcomeBanner'
import { AnnouncementSection } from '@/components/features/hr/AnnouncementSection'
import { format } from 'date-fns'
import type { AuditLog } from '@/types/api'

import { TeamPerformanceChart } from '@/components/features/hr/TeamPerformanceChart'

export default function HRDashboardPage() {
  const { data: stats, isLoading } = useHRStats()
  const { data: auditLogs = [] } = useAuditLogs(15)

  if (isLoading) return <PageSkeleton />
  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-6 md:p-8 bg-slate-50/50 min-h-screen flex items-center justify-center"
      >
        <div className="max-w-lg w-full bg-white border border-slate-200/60 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Activity size={20} />
          </div>
          <h1 className="text-xl font-black text-slate-900">Dashboard data unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            The page loaded, but the HR stats could not be fetched right now. Refresh once, and if it still stays blank, the API response needs a quick check.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 md:p-8 bg-slate-50/50 min-h-screen flex flex-col gap-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
        <HRWelcomeBanner />
        <div className="text-left md:text-right shrink-0">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">HR Dashboard</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-2">Overview & System Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Workforce"
          value={stats.totalActive}
          description="Active employees"
          color="blue"
          href="/hr/employees"
        />
        <StatCard 
          label="Away Today"
          value={stats.onLeaveToday}
          description="Currently on leave"
          color="rose"
          href="/hr/leaves"
        />
        <StatCard 
          label="Approvals"
          value={stats.pendingApprovals}
          description="Pending requests"
          color="amber"
          href="/hr/leave"
        />
        <StatCard 
          label="Availability"
          value={`${stats.availablePercent}%`}
          description="Team health score"
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        <div className="xl:col-span-8 h-[430px]">
          <TeamPerformanceChart data={stats.monthlyTrend} />
        </div>

        <div className="xl:col-span-4 h-[430px]">
          <PoliciesSection canUpload={true} className="h-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        <div className="xl:col-span-8 h-[560px]">
          <AnnouncementSection />
        </div>

        <div className="xl:col-span-4 h-[560px]">
          <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Recent Audit</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Live system feed</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 scrollbar-hide">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => <AuditLogRow key={log.id} log={log} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3">
                    <Shield size={14} />
                  </div>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No activities</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={() => window.location.href = '/hr/audit'}
                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
              >
                Full Audit Trail
              </button>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}

function AuditLogRow({ log }: { log: AuditLog }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all shrink-0">
          <Shield size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-slate-800 truncate leading-tight group-hover:text-blue-700 transition-colors">
            {log.action.replace(/_/g, ' ')}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
            {log.performer?.displayName || 'System'}
          </p>
        </div>
      </div>
      <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter group-hover:text-slate-500 transition-colors">
        {format(new Date(log.createdAt), 'dd MMM')}
      </span>
    </div>
  )
}
