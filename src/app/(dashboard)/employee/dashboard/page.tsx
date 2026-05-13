'use client'

import { motion } from 'framer-motion'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { AttendanceCard } from '@/components/shared/AttendanceCard'
import { UpcomingLeavesCard } from '@/components/shared/UpcomingLeavesCard'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard'
import { EmployeeWelcomeBanner } from '@/components/features/employee/EmployeeWelcomeBanner'
import { AnnouncementList } from '@/components/features/shared/AnnouncementList'

export default function EmployeeDashboardPage() {
  const { user, balance, stats, announcements, isLoading } = useEmployeeDashboard()

  if (isLoading || !user) return <PageSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 bg-[var(--color-page-bg)] min-h-screen"
    >
      {/* Welcome Banner */}
      <div className="mb-4">
        <EmployeeWelcomeBanner user={user} />
      </div>

      {/* Top cards row — stat cards narrower, content cards wider */}
      <div
        className="grid gap-3 mb-4"
        style={{ gridTemplateColumns: '1fr 1fr 1.8fr 1.5fr' }}
      >
        <StatCard
          label="Total Requests"
          value={stats?.totalThisMonth ?? 0}
          description="This month"
        />
        <StatCard
          label="Pending Requests"
          value={stats?.pendingCount ?? 0}
          description="Awaiting approval"
        />
        <UpcomingLeavesCard />
        <LeaveBalanceCard />
      </div>

      {/* Bottom row — attendance 2/3, policies 1/3 */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <AttendanceCard />
        <PoliciesSection canUpload={false} />
      </div>

      {/* Announcements */}
      <AnnouncementList announcements={announcements} />
    </motion.div>
  )
}
