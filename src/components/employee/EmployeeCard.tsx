import { getInitials } from '@/lib/utils/formatters'
import { AvailabilityBadge } from './AvailabilityBadge'
import type { EmployeeWithAvailability } from '@/types/employee'

interface EmployeeCardProps {
  employee: EmployeeWithAvailability
  onClick?: () => void
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
          {employee.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.profilePictureUrl} alt={employee.displayName} className="w-full h-full object-cover" />
          ) : (
            getInitials(employee.displayName)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 text-sm font-semibold truncate">{employee.displayName}</p>
          <p className="text-slate-500 text-xs truncate">{employee.jobTitle}</p>
          {employee.role && (
            <span className="inline-flex mt-1 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
              {employee.role}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3">
        <AvailabilityBadge status={employee.availabilityStatus} />
      </div>
    </div>
  )
}
