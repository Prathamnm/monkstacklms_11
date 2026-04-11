'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMsal } from '@azure/msal-react'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { CurrentUser } from '@/types/auth'

interface UserAvatarProps {
  user: CurrentUser
}

export function UserAvatar({ user }: UserAvatarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { instance } = useMsal()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const router = useRouter()

  async function handleSignOut() {
    setIsOpen(false)
    await instance.logoutRedirect()
  }

  function handleProfile() {
    setIsOpen(false)
    router.push('/profile')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
          {user.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            getInitials(user.displayName)
          )}
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[120px] truncate">
          {user.firstName}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-slate-900 text-sm font-semibold truncate">{user.displayName}</p>
              <p className="text-slate-500 text-xs truncate">{user.email}</p>
              <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="py-1">
              <button
                onClick={handleProfile}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={15} />
                My Profile
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
