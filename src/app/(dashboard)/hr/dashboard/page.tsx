'use client'

import { motion } from 'framer-motion'
import { Activity, Shield } from 'lucide-react'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'
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
  if (!stats) return null

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

      {/* Top Stats - Compact with Accent Lines */}
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Main Analytics Area */}
        <div className="xl:col-span-8 space-y-8">
          <TeamPerformanceChart data={stats.monthlyTrend} />
          
          <div className="bg-white border border-slate-200/60 rounded-2xl p-0 overflow-hidden shadow-sm">
            <AttendanceCard />
          </div>
        </div>

        {/* Sidebar: Audit & Activity */}
        <div className="xl:col-span-4 space-y-8">
          <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
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
            
            <div className="flex-1 overflow-y-auto p-4 space-y-0.5 scrollbar-hide">
              {auditLogs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
              {auditLogs.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-[11px] font-black text-slate-200 uppercase tracking-widest">No activities</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={() => window.location.href = '/hr/audit'}
                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
              >
                Full Audit Trail
              </button>
            </div>
          </section>

          {/* Shipped Up & Fixed height for internal scroll */}
          <PoliciesSection canUpload={true} className="h-[350px]" />
        </div>
      </div>

      {/* Shipped Down — full-width interactive Announcements manager */}
      <div className="w-full mt-4">
        <AnnouncementSection />
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
