'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { LeaveBalanceSummary } from '@/types/employee'

export function useLeaveBalance() {
  const { instance } = useMsal()

  return useQuery<LeaveBalanceSummary>({
    queryKey: ['leaveBalance'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const res = await fetch('/api/leave/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch leave balance')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}
