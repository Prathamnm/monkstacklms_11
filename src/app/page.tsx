'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDashboardPath } from '@/lib/utils/roleUtils'

export default function RootPage() {
  const router = useRouter()
  const { inProgress } = useMsal()
  const { data, isLoading, isError } = useCurrentUser()

  useEffect(() => {
    // Wait for MSAL to finish any in-progress interaction (login, token refresh, etc.)
    // before making any routing decisions
    if (inProgress !== InteractionStatus.None) return

    if (!data?.user) {
      // Still fetching user data — wait
      if (isLoading) return

      // User exists in Entra but hasn't been synced to the DB yet (e.g. a new user whose sync failed).
      // Redirect to /auth/callback to re-trigger the sync flow.
      if (isError) {
        router.replace('/auth/callback')
        return
      }
    }

    if (data?.user) {
      const path = getDashboardPath(data.user.role)
      router.replace(path)
      return
    }
  }, [inProgress, isLoading, data, isError, router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading your workspace...</p>
      </div>
    </div>
  )
}
