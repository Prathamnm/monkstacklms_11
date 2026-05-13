'use client'

import { format } from 'date-fns'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'

interface EmployeeWelcomeBannerProps {
  user: {
    displayName: string
    firstName: string
    jobTitle?: string | null
    profilePictureUrl?: string | null
  }
}

export function EmployeeWelcomeBanner({ user }: EmployeeWelcomeBannerProps) {
  const firstName = getCleanFirstName(user.firstName, user.displayName)

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold border border-blue-200 overflow-hidden shrink-0">
          {user.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            getInitials(user.displayName)
          )}
        </div>

        {/* Text */}
        <div>
          <h1 className="text-[18px] font-bold text-slate-900 leading-tight tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-none">
            {user.jobTitle || 'Team Member'}
          </p>
        </div>
      </div>

      {/* Date */}
      <p className="text-[11px] text-slate-400 leading-none">
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </p>
    </div>
  )
}
