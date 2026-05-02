'use client'

import { useQuery } from '@tanstack/react-query'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { format } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { TeamLeaveOverviewRecord } from '@/types/teamLeaveOverview'

export interface TeamLeaveOverviewParams {
  from: Date
  to: Date
  scope: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN'
  department?: string | null
}

function toYmd(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function useTeamLeaveOverview(params: TeamLeaveOverviewParams) {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  return useQuery<TeamLeaveOverviewRecord[]>({
    queryKey: [
      'teamLeaveOverview',
      toYmd(params.from),
      toYmd(params.to),
      params.scope,
      params.department ?? null,
    ],
    enabled: isAuthenticated,
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const url = new URL('/api/leaves/team-overview', window.location.origin)
      url.searchParams.set('from', toYmd(params.from))
      url.searchParams.set('to', toYmd(params.to))
      url.searchParams.set('scope', params.scope)
      if (params.department) url.searchParams.set('department', params.department)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Failed to load team overview (${res.status})`)
      }
      return res.json()
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

