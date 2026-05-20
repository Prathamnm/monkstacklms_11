'use client'

import { format } from 'date-fns'
import { getInitials } from '@/lib/utils/formatters'

interface ManagerWelcomeBannerProps {
  user: {
    displayName: string
    jobTitle?: string | null
    profilePictureUrl?: string | null
  }
}

export function ManagerWelcomeBanner({ user }: ManagerWelcomeBannerProps) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm mb-6">
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
            Welcome back, {user.displayName.split(' ')[0]} 👋
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {user.jobTitle || 'Manager'}
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
