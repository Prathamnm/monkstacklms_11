'use client'

import { format } from 'date-fns'
import { getInitials } from '@/lib/utils/formatters'
import { Card } from '@/components/shared/Card'

interface ManagerWelcomeBannerProps {
  user: {
    displayName: string
    jobTitle?: string | null
    profilePictureUrl?: string | null
  }
}

export function ManagerWelcomeBanner({ user }: ManagerWelcomeBannerProps) {
  return (
    <Card className="mb-6 bg-slate-50/80 border-slate-100 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-white shadow-sm overflow-hidden shrink-0">
            {user.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              getInitials(user.displayName)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">
              Welcome back, {user.displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">
              {user.jobTitle || 'CEO'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>
    </Card>
  )
}
