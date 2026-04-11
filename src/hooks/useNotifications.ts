'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { Notification } from '@/types/api'

export function useNotifications() {
  const { instance } = useMsal()

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    staleTime: 20 * 1000,
  })
}

export function useMarkAllNotificationsRead() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to mark notifications as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
