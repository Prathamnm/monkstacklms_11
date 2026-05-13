'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { TeamLeaveOverviewCard } from '@/components/leave/TeamLeaveOverviewCard'
import { LeaveCalendarPicker } from '@/components/leave/LeaveCalendarPicker'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveRulesModal } from '@/components/leave/LeaveRulesModal'
import { useLeaveManagement } from '@/hooks/useLeaveManagement'
import { LeaveBalanceStrip } from '@/components/features/employee/LeaveBalanceStrip'
import { LeaveRequestDetails } from '@/components/features/employee/LeaveRequestDetails'

export default function HRApplyLeavePage() {
  const router = useRouter()
  const [rulesOpen, setRulesOpen] = useState(false)
  
  const {
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
    totalDays,
    conflictCount,
    isSubmitDisabled,
    isSubmitting,
    handleSubmit,
    windowFrom,
    windowTo,
  } = useLeaveManagement({
    onSuccess: () => router.push('/hr/my-leaves')
  })

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader 
        title="Apply for Leave" 
        description="Select dates and submit your leave request" 
      />

      <LeaveBalanceStrip balance={leaveBalance} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
      >
        {/* Calendar & Overviews */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-2">
                <Calendar size={12} className="text-blue-500" />
                Select Dates
              </h3>
              <p className="text-[13px] font-medium text-slate-500">Choose your leave range on the calendar</p>
            </div>
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
            >
              <BookOpen size={14} />
              Leave Rules
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
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

      <LeaveRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
