'use client'

import { motion } from 'framer-motion'
import { Users, UserCheck, UserMinus, CalendarCheck } from 'lucide-react'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'
import { useHRStats, useAccrualManagement, useAuditLogs } from '@/hooks/useHRDashboardData'
import { HRWelcomeBanner } from '@/components/features/hr/HRWelcomeBanner'
import { AnnouncementSection } from '@/components/features/hr/AnnouncementSection'
import { format } from 'date-fns'
import { Play, Activity, Shield } from 'lucide-react'
import { HEADING_STYLES } from '@/constants/tailwind'

export default function HRDashboardPage() {
  const { data: stats, isLoading } = useHRStats()
  const { lastRun, runAccrual, isProcessing } = useAccrualManagement()
  const { data: auditLogs = [] } = useAuditLogs(5)

  if (isLoading) return <PageSkeleton />
  if (!stats) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen flex flex-col gap-6"
    >
      <HRWelcomeBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Employees"
          value={stats.totalActive}
          icon={<Users size={18} className="text-blue-600" />}
          description="Total workforce"
          color="bg-blue-500"
          href="/hr/employees"
        />
        <StatCard 
          label="On Leave Today"
          value={stats.onLeaveToday}
          icon={<UserMinus size={18} className="text-red-600" />}
          description="Out of office"
          color="bg-red-500"
          href="/hr/leaves"
        />
        <StatCard 
          label="Pending Approvals"
          value={stats.pendingApprovals}
          icon={<CalendarCheck size={18} className="text-amber-600" />}
          description="Awaiting action"
          color="bg-amber-500"
          href="/hr/leave"
        />
        <ActionCard 
          title="Run Accrual"
          description={lastRun ? `Last: ${format(new Date(lastRun), 'dd MMM')}` : "Sync balances"}
          icon={<Play size={18} className="text-purple-600" />}
          onClick={runAccrual}
          isLoading={isProcessing}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <AttendanceCard />
        </div>
        <div className="space-y-6">
          <section className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
                <Activity size={18} />
              </div>
              <div>
                <h3 className={HEADING_STYLES.cardHeader}>
                  Recent Audit
                </h3>
                <p className={HEADING_STYLES.cardSubtitle + " mt-1"}>
                  System activities
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {auditLogs.map((log: any) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
              {auditLogs.length === 0 && (
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest text-center py-8">No logs found</p>
              )}
            </div>
          </section>
          <PoliciesSection canUpload={false} />
        </div>
      </div>

      <AnnouncementSection />
    </motion.div>
  )
}

function AuditLogRow({ log }: { log: any }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0 shadow-sm">
          <Shield size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900 truncate leading-tight group-hover:text-blue-700 transition-colors">{log.action}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
            {log.performer?.displayName}
          </p>
        </div>
      </div>
      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-bold whitespace-nowrap group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-200">
        {format(new Date(log.createdAt), 'dd MMM')}
      </span>
    </div>
  )
}

function ActionCard({ title, description, icon, onClick, isLoading }: any) {
  return (
    <div className="bg-white border border-[var(--color-card-border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shrink-0">
          {icon}
        </div>
        <div>
          <h4 className={HEADING_STYLES.cardHeader + " leading-tight group-hover:text-blue-700 transition-colors"}>{title}</h4>
          <p className={HEADING_STYLES.cardSubtitle + " mt-1"}>{description}</p>
        </div>
      </div>
      <button 
        onClick={onClick}
        disabled={isLoading}
        className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all shadow-lg shadow-slate-100 active:scale-95"
      >
        {isLoading ? 'Processing...' : 'Run Now'}
      </button>
    </div>
  )
}
