'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Calendar } from 'lucide-react'

import { TeamLeaveOverviewCard } from '@/components/leave/TeamLeaveOverviewCard'
import { LeaveCalendarPicker } from '@/components/leave/LeaveCalendarPicker'
import { MyLeavesView } from '@/components/leave/MyLeavesView'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveRulesModal } from '@/components/leave/LeaveRulesModal'
import { useLeaveManagement } from '@/hooks/useLeaveManagement'
import { LeaveBalanceStrip } from '@/components/features/employee/LeaveBalanceStrip'
import { LeaveRequestDetails } from '@/components/features/employee/LeaveRequestDetails'
import { LeaveTabNavigation } from '@/components/features/employee/LeaveTabNavigation'

export default function HRLeavePage() {
  const [rulesOpen, setRulesOpen] = useState(false)
  
  const {
    activeTab,
    setActiveTab,
    selectedDates,
    setSelectedDates,
    visibleMonth,
    setVisibleMonth,
    reason,
    setReason,
    leaveTypeId,
    setLeaveTypeId,
    errors,
    dayOverrides,
    setDayOverrides,
    leaveBalance,
    holidays,
    existingLeaves,
    pendingCount,
    totalDays,
    conflictCount,
    leaveTypes,
    isSubmitDisabled,
    isSubmitting,
    handleSubmit,
    windowFrom,
    windowTo,
  } = useLeaveManagement()

  return (
    <div className="p-4 md:p-6 bg-[var(--color-page-bg)] min-h-screen space-y-4">
      <PageHeader 
        title="Leave Management" 
        description="HR Portal · Plan time off or review history" 
      />

      <LeaveBalanceStrip balance={leaveBalance} />

      <LeaveTabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        pendingCount={pendingCount} 
      />

      <AnimatePresence mode="wait">
        {activeTab === 'apply' ? (
          <motion.div
            key="apply"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-8"
          >
            {/* Calendar & Overviews */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-2">
                    <Calendar size={12} className="text-slate-500" />
                    Select Dates
                  </h3>
                  <p className="text-[13px] font-medium text-slate-500">Choose your leave days on the calendar</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  <BookOpen size={14} />
                  Leave Rules
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7">
                    <LeaveCalendarPicker
                      selected={selectedDates}
                      onSelect={setSelectedDates}
                      month={visibleMonth}
                      onMonthChange={setVisibleMonth}
                      holidays={holidays}
                      existingLeaves={existingLeaves}
                      dayOverrides={dayOverrides}
                      onDayOverrideChange={setDayOverrides}
                    />

                    {conflictCount > 0 && dayOverrides.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
                          <span className="text-[14px] font-black">!</span>
                        </div>
                        <p className="text-[11px] text-amber-900 font-bold uppercase tracking-widest">
                          {conflictCount} teammate{conflictCount !== 1 ? 's' : ''} also on leave during this period
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-8 lg:pt-0 lg:pl-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                      Team Availability
                    </h4>
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
              dayOverrides={dayOverrides}
              totalDays={totalDays}
              reason={reason}
              setReason={setReason}
              leaveTypeId={leaveTypeId}
              setLeaveTypeId={setLeaveTypeId}
              leaveTypes={leaveTypes}
              errors={errors}
              isSubmitDisabled={isSubmitDisabled}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </motion.div>
        ) : (
          <motion.div
            key="requests"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <MyLeavesView role="HR" initialLeaves={existingLeaves} />
          </motion.div>
        )}
      </AnimatePresence>

      <LeaveRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
