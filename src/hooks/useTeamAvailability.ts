'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { EmployeeWithAvailability } from '@/types/employee'

export function useTeamAvailability(date?: string) {
  const { instance } = useMsal()

  return useQuery<EmployeeWithAvailability[]>({
    queryKey: ['teamAvailability', date],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const params = date ? `?date=${date}` : ''
      const res = await fetch(`/api/employee/team${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch team availability')
      return res.json()
    },
    staleTime: 60 * 1000,
  })
}
