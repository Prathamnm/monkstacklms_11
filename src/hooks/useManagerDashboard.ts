'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Announcement } from '@/types/announcement'

export function useManagerDashboard() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  const userId = user?.id

  const now = useMemo(() => new Date(), [])
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Stats Queries
  const statsQueries = {
    pendingCount: useQuery({
      queryKey: ['pendingApprovalsCount', userId],
      enabled: !!userId,
      queryFn: async () => {
        const token = await getAccessToken(instance)
        const res = await fetch(`/api/leaves/pending?managerId=${encodeURIComponent(userId!)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch pending count')
        return res.json()
      },
    }),
    teamSize: useQuery({
      queryKey: ['teamSize', userId],
      enabled: !!userId,
      queryFn: async () => {
        const token = await getAccessToken(instance)
        const res = await fetch(`/api/teams/${encodeURIComponent(userId!)}/members?status=active`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch team size')
        return res.json()
      },
    }),
    onLeaveToday: useQuery({
      queryKey: ['onLeaveToday', userId],
      enabled: !!userId,
      queryFn: async () => {
        const token = await getAccessToken(instance)
        const res = await fetch(`/api/leaves/active-today?teamId=${encodeURIComponent(userId!)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch active leaves')
        return res.json()
      },
    }),
    approvedThisMonth: useQuery({
      queryKey: ['approvedThisMonth', userId, currentMonth, currentYear],
      enabled: !!userId,
      queryFn: async () => {
        const token = await getAccessToken(instance)
        const res = await fetch(`/api/leaves/approved?teamId=${encodeURIComponent(userId!)}&month=${currentMonth}&year=${currentYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch approved count')
        return res.json()
      },
    })
  }

  // Announcements Logic
  const announcementsQuery = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const postAnnouncement = useMutation({
    mutationFn: async (data: { title: string; content: string; audience: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, createdBy: userId }),
      })
      if (!res.ok) throw new Error('Failed to post announcement')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement posted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement deleted')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const isLoading = Object.values(statsQueries).some(q => q.isLoading) || announcementsQuery.isLoading

  return {
    user,
    stats: {
      teamSize: statsQueries.teamSize.data?.count ?? 0,
      onLeaveToday: statsQueries.onLeaveToday.data?.count ?? 0,
      pendingApprovals: statsQueries.pendingCount.data?.count ?? 0,
      approvedThisMonth: statsQueries.approvedThisMonth.data?.count ?? 0,
    },
    isLoading,
    announcements: announcementsQuery.data ?? [],
    isAnnouncementsLoading: announcementsQuery.isLoading,
    postAnnouncement: postAnnouncement.mutate,
    isPosting: postAnnouncement.isPending,
    deleteAnnouncement: deleteAnnouncement.mutate,
  }
}
