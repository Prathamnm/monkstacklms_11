'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { Announcement } from '@/types/announcement'
import type { AuditLog } from '@/types/api'
import toast from 'react-hot-toast'
import { toErrorMessage } from '@/lib/utils/typeGuards'

export interface HRStats {
  totalActive: number
  onLeaveToday: number
  pendingApprovals: number
  newJoinersThisMonth: number
  leavesThisMonth: number
  availablePercent: number
  monthlyTrend: { month: string; count: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
}

export function useHRStats() {
  const { instance } = useMsal()

  return useQuery<HRStats>({
    queryKey: ['hrStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [empRes, leavesRes] = await Promise.all([
        fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hr/leaves', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const employees = await empRes.json()
      const leaves = await leavesRes.json()

      const activeEmployees = Array.isArray(employees)
        ? employees.filter((e: { employmentStatus: string }) => e.employmentStatus === 'ACTIVE') : []
      const onLeaveToday = Array.isArray(employees)
        ? employees.filter((e: { availabilityStatus: string }) => e.availabilityStatus !== 'AVAILABLE').length : 0
      const pendingLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'PENDING').length : 0
      const approvedLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'APPROVED').length : 0
      const rejectedLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'REJECTED').length : 0

      return {
        totalActive: activeEmployees.length,
        onLeaveToday,
        pendingApprovals: pendingLeaves,
        newJoinersThisMonth: 0,
        leavesThisMonth: Array.isArray(leaves) ? leaves.length : 0,
        availablePercent: activeEmployees.length > 0
          ? Math.round(((activeEmployees.length - onLeaveToday) / activeEmployees.length) * 100) : 100,
        monthlyTrend: [
          { month: 'Nov', count: 8 }, { month: 'Dec', count: 12 },
          { month: 'Jan', count: 6 }, { month: 'Feb', count: 10 },
          { month: 'Mar', count: 14 }, { month: 'Apr', count: approvedLeaves },
        ],
        statusDistribution: [
          { name: 'Approved', value: approvedLeaves, color: '#16A34A' },
          { name: 'Pending', value: pendingLeaves, color: '#D97706' },
          { name: 'Rejected', value: rejectedLeaves, color: '#DC2626' },
        ],
      }
    },
  })
}

export function useAnnouncements() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()

  const query = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const postMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      if (!res.ok) throw new Error('Failed to post announcement')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement posted')
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement updated')
    },
    onError: (err: unknown) => toast.error(toErrorMessage(err)),
  })

  const deleteMutation = useMutation({
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
    onError: (err: unknown) => toast.error(toErrorMessage(err)),
  })

  return {
    announcements: query.data ?? [],
    isLoading: query.isLoading,
    postAnnouncement: postMutation,
    updateAnnouncement: updateMutation,
    deleteAnnouncement: deleteMutation,
  }
}

export function useAuditLogs(limit = 10) {
  const { instance } = useMsal()

  return useQuery<AuditLog[]>({
    queryKey: ['auditLogs', limit],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/admin/audit?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return (await res.json()) as AuditLog[]
    },
  })
}
