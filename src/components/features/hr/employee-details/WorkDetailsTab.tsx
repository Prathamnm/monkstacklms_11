'use client'

import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { HEADING_STYLES } from '@/constants/tailwind'
import type { Role } from '@/constants/roles'

interface WorkDetailsTabProps {
  data: any
}

export function WorkDetailsTab({ data }: WorkDetailsTabProps) {
  return (
    <div className="space-y-8">
      <h3 className={HEADING_STYLES.cardSubtitle + " mb-8 flex items-center gap-3 text-slate-500"}>
        <span className="w-8 h-[1px] bg-slate-200" /> Work Assignment
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold">Role</p>
          <span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', ROLE_COLORS[data.role as Role])}>
            {ROLE_LABELS[data.role as Role]}
          </span>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold">Reporting Manager</p>
          <p className="text-[14px] font-semibold text-slate-900 leading-snug">{data.manager?.displayName || 'Unassigned'}</p>
        </div>
        <div>
          <p className={HEADING_STYLES.cardSubtitle + " mb-2"}>Employment Status</p>
          <span
            className={cn(
              'inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest',
              data.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
            )}
          >
            {data.employmentStatus}
          </span>
        </div>
      </div>
    </div>
  )
}
