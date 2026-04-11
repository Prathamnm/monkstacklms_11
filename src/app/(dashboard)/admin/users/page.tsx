'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'

interface EntraUser {
  id: string
  displayName: string
  userPrincipalName: string
  entraObjectId: string
  syncedToDb: boolean
  role?: string
}

export default function AdminUsersPage() {
  const { instance } = useMsal()

  const { data: users = [], isLoading } = useQuery<EntraUser[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Users"
        description="All Entra ID users and their sync status"
        badge={users.length}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Entra ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Synced</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(user.displayName)}
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-medium">{user.displayName}</p>
                        <p className="text-slate-500 text-xs">{user.userPrincipalName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-slate-500 truncate max-w-[120px] block">{user.entraObjectId}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.syncedToDb ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {user.syncedToDb ? '✅ Synced' : '⏳ Not Synced'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {user.role ? (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}`}>
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
