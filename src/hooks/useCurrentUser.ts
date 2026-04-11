'use client'

import { useQuery } from '@tanstack/react-query'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { CurrentUser } from '@/types/auth'
import type { LeaveBalanceSummary } from '@/types/employee'

interface CurrentUserResponse {
  user: CurrentUser
  balance: LeaveBalanceSummary
}

export function useCurrentUser() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  return useQuery<CurrentUserResponse>({
    queryKey: ['currentUser'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch current user')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
