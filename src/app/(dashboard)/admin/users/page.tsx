'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/formatters'
import { useCurrentUser } from '@/hooks/useCurrentUser'
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
  const { data: currentUserData } = useCurrentUser()
  const currentUserId = currentUserData?.user?.id

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

  const filtered = users
    .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .filter(u => statusFilter === 'ALL' || u.employmentStatus === statusFilter)
    .filter(u => !search ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (u as any).workEmail?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )

  async function handleDeleteUser() {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete user')
      toast.success(`${userToDelete.displayName} removed from system`)
      setUserToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-4 lg:p-6 space-y-4">
      <PageHeader title="User Management" description="View synced tenant users and manage system access." badge={users.length} />

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
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Entra ID</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Join Date</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(user.displayName)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.displayName}</p>
                          <a
                            href={`mailto:${user.email}`}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            {user.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-slate-400 truncate max-w-[100px] block">
                        {user.entraObjectId?.startsWith('pending-') ? '⏳ Pending sync' : (user.entraObjectId?.slice(0, 8) + '...')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        user.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        user.employmentStatus === 'TERMINATED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{user.employmentStatus}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {(() => { try { return format(new Date(user.joinDate), 'dd MMM yyyy') } catch { return '—' } })()}
                    </td>
                    <td className="px-5 py-3">
                      {user.role !== 'ADMIN' && user.id !== currentUserId && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove from system"
                        >
                          <Trash2 size={14} />
                        </button>
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

      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Remove Employee from System"
        description={`This will permanently remove ${userToDelete?.displayName ?? 'this user'} and all their leave records from Monkstack HRM. Their Azure Entra ID account will NOT be affected. They will be re-added to the system automatically on their next login if still present in Azure.`}
        confirmLabel="Remove from System"
        variant="danger"
        isLoading={isDeleting}
      />
    </motion.div>
  )
}
