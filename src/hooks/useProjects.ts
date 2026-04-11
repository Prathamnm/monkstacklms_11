'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { ProjectWithAvailability } from '@/types/project'

export function useMyProjects() {
  const { instance } = useMsal()

  return useQuery<ProjectWithAvailability[]>({
    queryKey: ['myProjects'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const res = await fetch('/api/employee/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useAllProjects() {
  const { instance } = useMsal()

  return useQuery<ProjectWithAvailability[]>({
    queryKey: ['allProjects'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      if (!token) throw new Error('No access token')

      const res = await fetch('/api/manager/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}
