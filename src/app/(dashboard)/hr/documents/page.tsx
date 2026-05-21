'use client'

import { useState } from 'react'
import { FileText, Palmtree } from 'lucide-react'
import { motion } from 'framer-motion'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { HolidayManagerTab } from '@/components/shared/HolidayManagerTab'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils/cn'

export default function HRDocumentsPage() {
  const [tab, setTab] = useState<'policy' | 'holiday'>('policy')

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader
        title="Documents & Holidays"
        description="Manage policy documents and system holidays"
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
        {[
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
