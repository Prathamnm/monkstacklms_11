'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  CalendarDays,
  Users,
  ClipboardList,
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  RefreshCw,
  BarChart2,
  Settings,
  ScrollText,
  LogOut,
  CalendarPlus,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { CurrentUser } from '@/types/auth'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface SidebarProps {
  user: CurrentUser
  collapsed: boolean
  pendingCount?: number
}

function getNavItems(role: string, pendingCount = 0): NavItem[] {
  switch (role) {
    case 'EMPLOYEE':
      return [
        { label: 'Dashboard',      href: '/employee/dashboard',   icon: <LayoutDashboard size={18} /> },
        { label: 'Team Monkstack', href: '/employee/my-team',     icon: <Users size={18} /> },
        { label: 'My Projects',    href: '/employee/projects',    icon: <Folder size={18} /> },
        { label: 'My Calendar',    href: '/employee/calendar',    icon: <CalendarDays size={18} /> },
        { label: 'Apply Leave',    href: '/employee/apply-leave', icon: <CalendarPlus size={18} /> },
        { label: 'My Leaves',      href: '/employee/my-leaves',   icon: <ClipboardList size={18} /> },
      ]
    case 'MANAGER':
      return [
        { label: 'Dashboard',   href: '/manager/dashboard',   icon: <LayoutDashboard size={18} /> },
        { label: 'Team Monkstack', href: '/manager/employees',   icon: <Users size={18} /> },
        { label: 'My Calendar', href: '/manager/calendar',    icon: <CalendarDays size={18} /> },
        { label: 'Ongoing Projects', href: '/manager/projects',    icon: <FolderKanban size={18} /> },
        { label: 'Approvals',   href: '/manager/approvals',   icon: <CheckSquare size={18} />, badge: pendingCount },
        { label: 'Apply Leave', href: '/manager/apply-leave', icon: <CalendarPlus size={18} /> },
        { label: 'My Leaves',   href: '/manager/my-leaves',   icon: <ClipboardList size={18} /> },
      ]
    case 'HR':
      return [
        { label: 'Dashboard',      href: '/hr/dashboard',          icon: <LayoutDashboard size={18} /> },
        { label: 'Team Monkstack', href: '/hr/employees',          icon: <Users size={18} /> },
        { label: 'My Calendar',    href: '/hr/calendar',           icon: <CalendarDays size={18} /> },
        { label: 'Onboarding',     href: '/hr/lifecycle/onboard',  icon: <UserCheck size={18} /> },
        { label: 'Deboarding',     href: '/hr/lifecycle/offboard', icon: <UserX size={18} /> },
        { label: 'Leave Approvals',href: '/hr/leaves',             icon: <ClipboardList size={18} /> },
        { label: 'Apply Leave',    href: '/hr/apply-leave',        icon: <CalendarPlus size={18} /> },
        { label: 'My Leaves',      href: '/hr/my-leaves',          icon: <ClipboardList size={18} /> },
        { label: 'Reports',        href: '/hr/reports',            icon: <BarChart2 size={18} /> },
      ]
    case 'ADMIN':
      return [
        { label: 'Dashboard',        href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
        { label: 'User Management',  href: '/admin/users',     icon: <Users size={18} /> },
        { label: 'System Config',    href: '/admin/settings',  icon: <Settings size={18} /> },
        { label: 'Projects Overview',href: '/admin/projects',  icon: <FolderKanban size={18} /> },
        { label: 'Approvals',        href: '/admin/leaves',    icon: <CheckSquare size={18} /> },
        { label: 'Reports',          href: '/admin/reports',   icon: <BarChart2 size={18} /> },
        { label: 'Audit Log',        href: '/admin/audit',     icon: <ScrollText size={18} /> },
      ]
    default:
      return []
  }
}

export function Sidebar({ user, collapsed, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { instance } = useMsal()
  const navItems = getNavItems(user.role, pendingCount)

  async function handleSignOut() {
    await instance.logoutRedirect()
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'flex flex-col h-full bg-slate-900 overflow-hidden flex-shrink-0',
        user.role === 'ADMIN' && 'border-r-2 border-red-500'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-white font-bold text-sm leading-none">Monkstack HRM</p>
              <p className="text-slate-400 text-xs mt-0.5">Human Resources</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <motion.button
              key={item.href}
              onClick={() => router.push(item.href)}
              whileHover={{ x: collapsed ? 0 : 4 }}
              transition={{ duration: 0.1 }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 mx-0 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-slate-800 text-white border-l-2 border-blue-500 pl-[14px]'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-slate-800 p-3 flex-shrink-0">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profilePictureUrl}
                alt={user.displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              getInitials(user.displayName)
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-white text-xs font-medium truncate">{user.displayName}</p>
                <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-slate-400 hover:text-white transition-colors p-1 rounded"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
