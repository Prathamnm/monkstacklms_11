'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { LeaveRequest } from '@/types/leave'

export type ApprovalFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export function useManagerApprovals() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<ApprovalFilter>('PENDING')
  
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalReason, setApprovalReason] = useState('')

  const { data: approvals = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['managerApprovals', filter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/approvals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load approvals')
      return res.json()
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string
      action: 'approve' | 'reject'
      reason?: string
    }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/approvals/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Action failed')
      }
      return res.json()
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave rejected')
      queryClient.invalidateQueries({ queryKey: ['managerApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] })
      setSelectedLeave(null)
      setApproveDialogOpen(false)
      setRejectDialogOpen(false)
      setRejectionReason('')
      setApprovalReason('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    approvals,
    isLoading,
    filter,
    setFilter,
    selectedLeave,
    setSelectedLeave,
    approveDialogOpen,
    setApproveDialogOpen,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectionReason,
    setRejectionReason,
    approvalReason,
    setApprovalReason,
    handleAction: actionMutation.mutate,
    isProcessing: actionMutation.isPending,
  }
}
