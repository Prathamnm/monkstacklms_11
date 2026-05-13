'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { LeaveRequest } from '@/types/leave'
import toast from 'react-hot-toast'

export function useMyLeaves() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()

  const query = useQuery<LeaveRequest[]>({
    queryKey: ['myLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employee/leaves', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load leaves')
      return res.json()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/cancel/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to cancel leave')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Leave request cancelled')
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  return {
    leaves: query.data ?? [],
    isLoading: query.isLoading,
    cancelLeave: cancelMutation,
  }
}
