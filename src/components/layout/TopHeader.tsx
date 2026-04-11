'use client'

import { Menu, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { NotificationBell } from './NotificationBell'
import { UserAvatar } from './UserAvatar'
import type { CurrentUser } from '@/types/auth'

interface TopHeaderProps {
  user: CurrentUser
  onToggleSidebar: () => void
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]

  const titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
      profile: 'My Profile',
    'my-leaves': 'My Leaves',
    'my-team': 'My Team',
    approvals: 'Approvals',
    employees: 'Employees',
    lifecycle: 'Employee Lifecycle',
    leaves: 'All Leaves',
    reports: 'Reports',
    rules: 'Accrual Rules',
    users: 'Users',
    audit: 'Audit Log',
    settings: 'Settings',
    onboard: 'Onboard Employee',
  }

  if (!isNaN(Number(last)) || last?.length > 20) {
    return titleMap[segments[segments.length - 2]] ?? 'Details'
  }

  return titleMap[last] ?? (last ? last.charAt(0).toUpperCase() + last.slice(1) : 'Dashboard')
}

export function TopHeader({ user, onToggleSidebar }: TopHeaderProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-all"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-slate-900 font-semibold text-base">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-all hidden md:flex"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        <NotificationBell />
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <UserAvatar user={user} />
      </div>
    </header>
  )
}
