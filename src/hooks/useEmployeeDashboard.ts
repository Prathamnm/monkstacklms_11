'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Announcement } from '@/types/announcement'

export function useEmployeeDashboard() {
  const { instance } = useMsal()
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser()
  const user = currentUserData?.user

  const statsQuery = useQuery({
    queryKey: ['leaveStats', user?.id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/requests/stats?userId=${user?.id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (!res.ok) throw new Error('Failed to fetch leave stats')
      return res.json()
    },
    enabled: !!user?.id,
  })

  const announcementsQuery = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
    enabled: !isUserLoading,
  })

  return {
    user,
    balance: currentUserData?.balance,
    stats: statsQuery.data,
    announcements: announcementsQuery.data ?? [],
    isLoading: isUserLoading || statsQuery.isLoading || announcementsQuery.isLoading,
  }
}
