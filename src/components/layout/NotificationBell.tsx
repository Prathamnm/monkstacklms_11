'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import { timeAgo } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils/cn'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: notifications = [], isLoading } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const notificationIcons: Record<string, string> = {
    LEAVE_APPLIED: '📋',
    LEAVE_APPROVED: '✅',
    LEAVE_REJECTED: '❌',
    LEAVE_CANCELLED: '🚫',
    LEAVE_REVOKED: '⚠️',
    BALANCE_ADJUSTED: '📊',
    EMPLOYEE_ONBOARDED: '👋',
    EMPLOYEE_OFFBOARDED: '🔔',
    PROJECT_ASSIGNED: '📁',
    PROJECT_REMOVED: '📁',
    SYSTEM: '🔔',
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-all duration-150',
          isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        )}
        animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">🔔</div>
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer',
                      !notification.isRead && 'bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">
                        {notificationIcons[notification.type] ?? '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-xs font-medium leading-snug">
                          {notification.title}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5 leading-snug">
                          {notification.message}
                        </p>
                        <p className="text-slate-400 text-xs mt-1">{timeAgo(notification.createdAt)}</p>
                      </div>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
