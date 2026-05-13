'use client'

import { getInitials } from '@/lib/utils/formatters'
import { AvailabilityBadge } from './AvailabilityBadge'
import type { EmployeeWithAvailability } from '@/types/employee'
import { cn } from '@/lib/utils/cn'

interface EmployeeCardProps {
  employee: EmployeeWithAvailability
  onClick?: () => void
  showActions?: boolean
  className?: string
}

export function EmployeeCard({ employee, onClick, className }: EmployeeCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 transition-all shadow-sm",
        onClick ? "cursor-pointer hover:border-blue-200 hover:shadow-md active:scale-[0.98]" : "cursor-default",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-[14px] font-bold shrink-0 transition-transform group-hover:scale-105 overflow-hidden">
        {employee.profilePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={employee.profilePictureUrl}
            alt={employee.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          getInitials(employee.displayName)
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-slate-900 truncate leading-tight group-hover:text-blue-700 transition-colors">
          {employee.displayName}
        </p>
        <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
          {employee.workEmail || '—'}
        </p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 opacity-80">
          {employee.jobTitle || 'No title'}
        </p>
      </div>

      <div className="shrink-0">
        <AvailabilityBadge status={employee.availabilityStatus} />
      </div>
    </div>
  )
}
