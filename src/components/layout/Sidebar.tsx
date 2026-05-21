'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  ClipboardList,
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  ScrollText,
  LogOut,
  Menu,
  FileText,
} from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS } from '@/constants/roles'
import { clearClientAuthState } from '@/lib/auth/clientSession'
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
  onToggle: () => void
  pendingCount?: number
}

function getNavItems(role: string, pendingCount = 0): NavItem[] {
  switch (role) {
    case 'EMPLOYEE':
      return [
        { label: 'Dashboard',      href: '/employee/dashboard',   icon: <LayoutDashboard size={18} /> },
        { label: 'Team Monkstack', href: '/employee/my-team',     icon: <Users size={18} /> },
        { label: 'Leave Management',          href: '/employee/leave',       icon: <ClipboardList size={18} /> },
      ]
    case 'MANAGER':
      return [
        { label: 'Dashboard',   href: '/manager/dashboard',   icon: <LayoutDashboard size={18} /> },
        { label: 'Team Monkstack', href: '/manager/employees',   icon: <Users size={18} /> },
        { label: 'Approvals',   href: '/manager/approvals',   icon: <CheckSquare size={18} />, badge: pendingCount },
        { label: 'Leave Management',       href: '/manager/leave',       icon: <ClipboardList size={18} /> },
      ]
    case 'HR':
      return [
        { label: 'Dashboard',      href: '/hr/dashboard',          icon: <LayoutDashboard size={18} /> },
        { label: 'Team Monkstack', href: '/hr/employees',          icon: <Users size={18} /> },
        { label: 'Leave Management',          href: '/hr/leave',              icon: <ClipboardList size={18} /> },
        { label: 'Documents',      href: '/hr/documents',          icon: <FileText size={18} /> },
        { label: 'Reports',        href: '/hr/reports',            icon: <BarChart2 size={18} /> },
        { label: 'Users & Roles',  href: '/hr/users',              icon: <Users size={18} /> },
        { label: 'Audit Log',      href: '/hr/audit',              icon: <ScrollText size={18} /> },
      ]
    default:
      return []
  }
}

export function Sidebar({ user, collapsed, onToggle, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { instance } = useMsal()
  const navItems = getNavItems(user.role, pendingCount)

  async function handleSignOut() {
    clearClientAuthState()
    await instance.logoutRedirect()
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'flex flex-col h-full bg-[#0a0a0a] overflow-hidden flex-shrink-0',
        user.role === 'HR' && 'border-r-2 border-purple-500'
      )}
    >
      {/* Logo Area */}
      <div className={cn(
        "flex items-center px-4 py-5 border-b border-[rgba(255,255,255,0.07)] flex-shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
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
                className="flex-1 min-w-0"
              >
                <p className="text-white font-bold text-sm leading-none truncate">Monkstack LMS</p>
                <p className="text-[rgba(255,255,255,0.4)] text-xs mt-0.5">Learning Management</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Top Toggle (Expanded only) */}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
            title="Collapse sidebar"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <motion.button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 mx-0 text-sm font-medium transition-colors duration-150 appearance-none border-0 outline-none',
                isActive
                  ? 'bg-[rgba(255,255,255,0.08)] text-white border-l-2 border-white pl-[14px]'
                  : 'text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white',
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
                <span className="bg-slate-700 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom Toggle (Collapsed only) */}
      {collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all duration-200"
            title="Expand sidebar"
          >
            <Menu size={20} />
          </button>
        </div>
      )}

      {/* User card */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-3 flex-shrink-0">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
                <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)]">
                  {ROLE_LABELS[user.role]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors p-1 rounded"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
