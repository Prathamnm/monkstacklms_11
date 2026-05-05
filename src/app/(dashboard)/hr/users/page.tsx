'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Search, Trash2 } from 'lucide-react'
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
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader title="User Management" description="View synced tenant users and manage system access." badge={users.length} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 220,
            flex: '1 1 220px',
            maxWidth: 360,
            background: 'var(--color-card-bg)',
            border: '0.5px solid var(--color-card-border)',
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          <Search size={16} color="var(--color-muted)" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              background: 'transparent',
              color: 'var(--color-heading)',
            }}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}>
          <option value="ALL">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading users...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👤" title="No users found" description="No users match the current filters." />
      ) : (
        <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-card-border)', background: 'var(--color-page-bg)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entra ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Join Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--icon-pill-blue-bg)', color: 'var(--icon-pill-blue-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                          {getInitials(user.displayName)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{user.displayName}</p>
                          <a
                            href={`mailto:${user.email}`}
                            style={{ fontSize: 12, color: 'var(--icon-pill-blue-stroke)', textDecoration: 'none' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {user.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-muted)' }}>
                        {user.entraObjectId?.startsWith('pending-') ? '⏳ Pending sync' : (user.entraObjectId?.slice(0, 8) + '...')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        user.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        user.employmentStatus === 'TERMINATED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{user.employmentStatus}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--color-muted)' }}>
                      {(() => { try { return format(new Date(user.joinDate), 'dd MMM yyyy') } catch { return '—' } })()}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      {user.role !== 'ADMIN' && user.id !== currentUserId && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
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
          <div style={{ padding: '10px 20px', borderTop: '0.5px solid var(--color-card-border)', fontSize: 12, color: 'var(--color-muted)' }}>
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
