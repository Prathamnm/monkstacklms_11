'use client'

import { motion } from 'framer-motion'
import { Users, CalendarX, CheckSquare, Calendar } from 'lucide-react'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { useManagerDashboard } from '@/hooks/useManagerDashboard'
import { ManagerWelcomeBanner } from '@/components/features/manager/ManagerWelcomeBanner'
import { AnnouncementList } from '@/components/features/shared/AnnouncementList'

export default function ManagerDashboardPage() {
  const { 
    user, 
    stats, 
    announcements, 
    isLoading 
  } = useManagerDashboard()

  if (isLoading || !user) return <PageSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6"
    >
      <ManagerWelcomeBanner user={user} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Team size"
          value={stats.teamSize}
          icon={<Users size={18} className="text-blue-600" />}
          description="Active members"
          color="bg-slate-800"
          href="/manager/employees"
        />
        <StatCard 
          label="On leave today"
          value={stats.onLeaveToday}
          icon={<CalendarX size={18} className="text-red-600" />}
          description="Out of office"
          color="bg-red-500"
          href="/manager/employees?filter=on-leave-today"
        />
        <StatCard 
          label="Pending approvals"
          value={stats.pendingApprovals}
          icon={<CheckSquare size={18} className="text-amber-600" />}
          description="Action required"
          color="bg-amber-500"
          href="/manager/approvals"
        />
        <StatCard 
          label="Approved this month"
          value={stats.approvedThisMonth}
          icon={<Calendar size={18} className="text-emerald-600" />}
          description="Leave tracking"
          color="bg-emerald-500"
          href="/manager/approvals?filter=approved"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          {/* Attendance feature removed */}
        </div>
        
        <div className="space-y-6">
          <PoliciesSection canUpload={false} />
        </div>
      </div>

      <AnnouncementList announcements={announcements} />
    </motion.div>
  )
}
