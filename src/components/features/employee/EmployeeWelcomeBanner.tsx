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
    <div className="bg-white border border-slate-200/60 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white text-base font-bold border border-slate-200 shadow-sm overflow-hidden shrink-0">
          {user.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            getInitials(user.displayName)
          )}
        </div>

        {/* Text */}
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {user.jobTitle || 'Team Member'}
          </p>
        </div>
      </div>

      {/* Date */}
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none hidden sm:block">
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </p>
    </div>
  )
}
