'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/formatters'
import type { Role } from '@/types/auth'

interface AdminUser {
  id: string
  displayName: string
  email: string
  entraObjectId?: string
  role: Role
  employmentStatus: string
  jobTitle?: string | null
  joinDate: string
}

const ROLE_OPTIONS: Role[] = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']

export default function AdminUsersPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ id: string; name: string; currentRole: Role } | null>(null)
  const [newRole, setNewRole] = useState<string>('')
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string; status: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

  const roleChangeMutation = useMutation({
    mutationFn: async () => {
      if (!roleChangeTarget || !newRole) throw new Error('Missing data')
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/admin/users/${roleChangeTarget.id}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setRoleChangeTarget(null); setNewRole(''); setActionError(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!deactivateTarget) throw new Error('Missing data')
      const nextStatus = deactivateTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/admin/users/${deactivateTarget.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setDeactivateTarget(null); setActionError(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const filtered = users
    .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .filter(u => statusFilter === 'ALL' || u.employmentStatus === statusFilter)
    .filter(u => !search ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8 space-y-6">
      <PageHeader title="User Management" description="Manage system users, roles, and account statuses." badge={users.length} />

      <div className="flex gap-3 flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
          className="flex-1 min-w-48 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
          <option value="ALL">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {actionError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{actionError}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading users...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👤" title="No users found" description="No users match the current filters." />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-4 font-medium">Employee</th>
                  <th className="px-5 py-4 font-medium">Entra ID</th>
                  <th className="px-5 py-4 font-medium">Role</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Joined</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(user.displayName)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.displayName}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-400 truncate max-w-[100px] block">
                        {user.entraObjectId?.startsWith('pending-') ? '⏳ Pending sync' : (user.entraObjectId?.slice(0, 8) + '...')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        user.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        user.employmentStatus === 'TERMINATED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{user.employmentStatus}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {(() => { try { return format(new Date(user.joinDate), 'dd MMM yyyy') } catch { return '—' } })()}
                    </td>
                    <td className="px-5 py-4">
                      {user.employmentStatus !== 'TERMINATED' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setRoleChangeTarget({ id: user.id, name: user.displayName, currentRole: user.role }); setNewRole(user.role) }}
                            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                            Change Role
                          </button>
                          <button
                            onClick={() => setDeactivateTarget({ id: user.id, name: user.displayName, status: user.employmentStatus })}
                            className={`text-xs border px-2 py-1 rounded-lg transition-colors font-medium ${
                              user.employmentStatus === 'ACTIVE'
                                ? 'text-red-600 border-red-200 hover:bg-red-50'
                                : 'text-green-600 border-green-200 hover:bg-green-50'
                            }`}>
                            {user.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      )}

      {/* Role change inline modal */}
      {roleChangeTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-slate-900 mb-1">Change Role</h3>
            <p className="text-sm text-slate-500 mb-4">{roleChangeTarget.name}</p>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 mb-4">
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setRoleChangeTarget(null); setActionError(null) }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => roleChangeMutation.mutate()} disabled={roleChangeMutation.isPending || newRole === roleChangeTarget.currentRole}
                className="flex-1 rounded-xl bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {roleChangeMutation.isPending ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title={deactivateTarget?.status === 'ACTIVE' ? 'Deactivate Account' : 'Reactivate Account'}
        description={`Are you sure you want to ${deactivateTarget?.status === 'ACTIVE' ? 'deactivate' : 'reactivate'} ${deactivateTarget?.name}'s account?${deactivateTarget?.status === 'ACTIVE' ? ' Their Entra ID access will also be revoked.' : ''}`}
        confirmLabel={deactivateTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
        cancelLabel="Cancel"
        onConfirm={() => statusMutation.mutate()}
        onClose={() => setDeactivateTarget(null)}
        isLoading={statusMutation.isPending}
      />
    </motion.div>
  )
}
