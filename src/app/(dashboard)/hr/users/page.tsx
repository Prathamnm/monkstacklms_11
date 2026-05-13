'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Search, Trash2, UserCircle, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/formatters'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Role } from '@/constants/roles'

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

const ROLE_OPTIONS: Role[] = ['EMPLOYEE', 'MANAGER', 'HR']

export default function AdminUsersPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const { data: currentUserData } = useCurrentUser()
  const currentUserId = currentUserData?.user?.id

  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/users', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => roleFilter === 'ALL' || u.role === roleFilter)
      .filter((u) => statusFilter === 'ALL' || u.employmentStatus === statusFilter)
      .filter((u) => {
        if (!q) return true
        const hay = [u.displayName, u.email, u.jobTitle ?? '']
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
  }, [users, roleFilter, statusFilter, search])

  async function handleDeleteUser() {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/users/${userToDelete.id}`, {
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
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader 
        title="User & Access Management" 
        description="Configure system access and manage synced workforce accounts." 
        badge={users.length} 
      />

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-4 flex-1 min-w-[300px] bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-300 transition-all group">
          <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or job title..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <div className="flex items-center gap-2 px-3 text-slate-400 border-r border-slate-200 mr-1">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
          </div>
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:text-blue-600 transition-colors"
          >
            <option value="ALL">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:text-blue-600 transition-colors ml-4 mr-2"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading system users...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👤" title="No users found" description="No workforce accounts match the current filters." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Employee</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Entra ID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Role</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Join Date</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(user => (
                  <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-[13px] font-bold shrink-0 transition-transform group-hover:scale-105">
                          {getInitials(user.displayName)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{user.displayName}</p>
                          <a
                            href={`mailto:${user.email}`}
                            className="text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            {user.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle size={14} className="text-slate-300" />
                        <span className="font-mono text-[11px] text-slate-500 font-medium">
                          {user.entraObjectId?.startsWith('pending-') ? '⏳ PENDING SYNC' : (user.entraObjectId?.slice(0, 12).toUpperCase() + '...')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border shadow-sm', 
                        ROLE_COLORS[user.role] || 'bg-slate-50 text-slate-500'
                      )}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border",
                        user.employmentStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        user.employmentStatus === 'TERMINATED' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-slate-50 text-slate-500 border-slate-100'
                      )}>
                        {user.employmentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-bold text-slate-500">
                        {(() => { try { return format(new Date(user.joinDate), 'dd MMM yyyy') } catch { return '—' } })()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role !== 'HR' && user.id !== currentUserId && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          title="Remove from system"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {filtered.length} of {users.length} workforce accounts
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Permanently Remove Account"
        description={`This will immediately remove ${userToDelete?.displayName ?? 'this user'} and all associated records from the HRM system. Their Azure Entra ID credentials will remain untouched, but they will lose all historical LMS data.`}
        confirmLabel="Remove Permanently"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
