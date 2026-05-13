'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'

import { TeamLeaveOverviewCard } from '@/components/leave/TeamLeaveOverviewCard'
import { LeaveCalendarPicker } from '@/components/leave/LeaveCalendarPicker'
import { MyLeavesView } from '@/components/leave/MyLeavesView'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveRulesModal } from '@/components/leave/LeaveRulesModal'
import { useLeaveManagement } from '@/hooks/useLeaveManagement'
import { LeaveBalanceStrip } from '@/components/features/employee/LeaveBalanceStrip'
import { LeaveRequestDetails } from '@/components/features/employee/LeaveRequestDetails'
import { LeaveTabNavigation } from '@/components/features/employee/LeaveTabNavigation'

export default function ManagerLeavePage() {
  const [rulesOpen, setRulesOpen] = useState(false)
  
  const {
    activeTab,
    setActiveTab,
    range,
    setRange,
    visibleMonth,
    setVisibleMonth,
    startHalfDay,
    setStartHalfDay,
    endHalfDay,
    setEndHalfDay,
    reason,
    setReason,
    title,
    setTitle,
    isEmergency,
    setIsEmergency,
    errors,
    dayOverrides,
    setDayOverrides,
    leaveBalance,
    holidays,
    existingLeaves,
    pendingCount,
    totalDays,
    conflictCount,
    isSubmitDisabled,
    isSubmitting,
    handleSubmit,
    windowFrom,
    windowTo,
  } = useLeaveManagement()

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader 
        title="Leave Management" 
        description="Manager Portal · Time off requests are auto-approved" 
      />

      <LeaveBalanceStrip balance={leaveBalance} />

      <LeaveTabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        pendingCount={pendingCount} 
      />

      {activeTab === 'apply' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-8"
        >
          {/* Calendar & Overviews */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-heading)]">Select Dates</h3>
                <p className="text-sm text-[var(--color-muted)]">Click on the calendar to select your leave range</p>
              </div>
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
              >
                <BookOpen size={16} />
                Leave Rules
              </button>
            </div>

            <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7">
                  <LeaveCalendarPicker
                    selected={range}
                    onSelect={setRange}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    holidays={holidays}
                    existingLeaves={existingLeaves}
                    dayOverrides={dayOverrides}
                    onDayOverrideChange={setDayOverrides}
                    startHalfDay={startHalfDay}
                    endHalfDay={endHalfDay}
                  />

                  {conflictCount > 0 && range?.from && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
                    >
                      <p className="text-[13px] text-amber-900 font-bold uppercase tracking-tight">
                        {conflictCount} teammate{conflictCount !== 1 ? 's' : ''} also on leave
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[var(--color-card-border)] pt-8 lg:pt-0 lg:pl-8">
                  <TeamLeaveOverviewCard
                    from={windowFrom}
                    to={windowTo}
                    variant="embedded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Details Sidebar */}
          <LeaveRequestDetails 
            title={title}
            setTitle={setTitle}
            range={range}
            totalDays={totalDays}
            startHalfDay={startHalfDay}
            setStartHalfDay={setStartHalfDay}
            endHalfDay={endHalfDay}
            setEndHalfDay={setEndHalfDay}
            reason={reason}
            setReason={setReason}
            isEmergency={isEmergency}
            setIsEmergency={setIsEmergency}
            errors={errors}
            isSubmitDisabled={isSubmitDisabled}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </motion.div>
      )}

      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MyLeavesView role="MANAGER" initialLeaves={existingLeaves} />
        </motion.div>
      )}

      <LeaveRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
