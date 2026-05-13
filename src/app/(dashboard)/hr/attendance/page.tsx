'use client'

import { useState } from 'react'
import { Upload, FileText, Palmtree, History } from 'lucide-react'
import { motion } from 'framer-motion'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { HolidayManagerTab } from '@/components/shared/HolidayManagerTab'
import { PageHeader } from '@/components/shared/PageHeader'
import { AttendanceUploadTab } from '@/components/features/hr/AttendanceUploadTab'
import { AttendanceRecordsTab } from '@/components/features/hr/AttendanceRecordsTab'
import { cn } from '@/lib/utils/cn'

export default function HRAttendancePage() {
  const [tab, setTab] = useState<'attendance' | 'policy' | 'holiday'>('attendance')
  const [attendanceView, setAttendanceView] = useState<'upload' | 'records'>('upload')

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader
        title="Resources & Attendance"
        description="Manage employee records, policy documents, and system holidays"
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
        {[
          { id: 'attendance', label: 'Attendance', icon: Upload },
          { id: 'policy', label: 'Policy Docs', icon: FileText },
          { id: 'holiday', label: 'Holidays', icon: Palmtree },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
              tab === t.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 bg-slate-100/50 rounded-xl p-1 w-fit">
            {[
              { id: 'upload', label: 'Upload Data', icon: Upload },
              { id: 'records', label: 'History & Audit', icon: History },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setAttendanceView(v.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  attendanceView === v.id
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <v.icon size={12} />
                {v.label}
              </button>
            ))}
          </div>
          
          <motion.div
            key={attendanceView}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {attendanceView === 'upload' ? <AttendanceUploadTab /> : <AttendanceRecordsTab />}
          </motion.div>
        </div>
      )}

      {tab === 'policy' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PoliciesSection canUpload={true} />
        </motion.div>
      )}

      {tab === 'holiday' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <HolidayManagerTab />
        </motion.div>
      )}
    </div>
  )
}
