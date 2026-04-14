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
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch current user (${res.status})`)
      }
      return res.json()
    },
    // Keep auth/user data fresh to avoid stale role/session behavior.
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
