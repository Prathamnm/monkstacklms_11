'use client'

import { usePathname } from 'next/navigation'
import { NotificationBell } from './NotificationBell'
import { UserAvatar } from './UserAvatar'
import type { CurrentUser } from '@/types/auth'

interface TopHeaderProps {
  user: CurrentUser
  onToggle: () => void
  collapsed: boolean
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]

  const titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
      profile: 'My Profile',
    'my-leaves': 'My Leaves',
    'my-team': 'Team Monkstack',
    'apply-leave': 'Apply Leave',
    approvals: 'Approvals',
    employees: 'Team Monkstack',
    lifecycle: 'Employee Lifecycle',
    leaves: 'All Leaves',
    leave: 'Leave Management',
    reports: 'Reports',
    rules: 'Accrual Rules',
    users: 'Users',
    audit: 'Audit Log',
    settings: 'Settings',
    onboard: 'Onboard Employee',
    attendance: 'Document Uploads',
  }

  if (!isNaN(Number(last)) || last?.length > 20) {
    return titleMap[segments[segments.length - 2]] ?? 'Details'
  }

  return titleMap[last] ?? (last ? last.charAt(0).toUpperCase() + last.slice(1) : 'Dashboard')
}

export function TopHeader({ user, onToggle: _onToggle, collapsed: _collapsed }: TopHeaderProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-50">
      <div className="flex items-center gap-4">
        <h2 className="text-slate-900 font-semibold text-base">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <UserAvatar user={user} />
      </div>
    </header>
  )
}
