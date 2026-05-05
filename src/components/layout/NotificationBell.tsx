'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, X, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/useNotifications'
import { timeAgo } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils/cn'
import type { Notification } from '@/types/api'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const { data: notifications = [], isLoading } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const markRead = useMarkNotificationRead()
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
    ANNOUNCEMENT_POSTED: '📢',
    ROLE_CHANGED: '🔄',
    HOLIDAY_CREATED: '🗓️',
    ACCOUNT_DEACTIVATED: '🔒',
    EMPLOYEE_ONBOARDED: '👋',
    EMPLOYEE_OFFBOARDED: '🔔',
    PROJECT_ASSIGNED: '📁',
    PROJECT_REMOVED: '📁',
    SYSTEM: '🔔',
  }

  const handleNotificationClick = (n: Notification) => {
    setSelectedNotification(n)
    if (!n.isRead) {
      markRead.mutate(n.id)
    }
  }

  return (
    <div ref={ref} className="relative" style={{ position: 'relative', zIndex: 9999 }}>
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
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{ zIndex: 9999 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
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
                <div className="py-8 text-center text-slate-400 text-sm italic">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-3xl mb-3 opacity-20">🔔</div>
                  <p className="text-slate-400 text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 12).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'px-4 py-3 border-b border-slate-50 hover:bg-slate-100 transition-all cursor-pointer group',
                      !notification.isRead && 'bg-blue-50/40'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                        {notificationIcons[notification.type] ?? '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-slate-900 text-xs leading-snug truncate",
                          !notification.isRead ? "font-semibold" : "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{timeAgo(notification.createdAt)}</p>
                      </div>
                      {!notification.isRead && (
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">
                    {notificationIcons[selectedNotification.type] ?? '🔔'}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-bold text-base leading-tight">
                      {selectedNotification.title}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1">{timeAgo(selectedNotification.createdAt)}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedNotification(null)
                    setIsOpen(false)
                  }}
                  className="w-full mt-6 bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
