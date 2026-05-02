'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { Download, Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { getInitials } from '@/lib/utils/formatters'
import type { LeaveRequest } from '@/types/leave'

export default function HRLeavesPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['hrLeaves', statusFilter],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/hr/leaves${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load leaves')
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leaves
    return leaves.filter((leave) => {
      const emp = leave.employee?.displayName ?? ''
      const blob = [leave.title, leave.reason, emp, leave.employee?.email ?? '']
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [leaves, search])

  return (
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title="All Leaves"
        description="View and manage all leave requests across the organization"
        badge={filtered.length}
        actions={
          <button className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 260,
            flex: '1 1 260px',
            maxWidth: 420,
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          <Search size={16} color="var(--color-muted)" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, title, reason…"
            aria-label="Search leave requests"
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📋" title="No leave requests found" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--color-card-border)', background: 'var(--color-page-bg)' }}>
                <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</th>
                <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</th>
                <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</th>
                <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((leave) => (
                <tr
                  key={leave.id}
                  style={{ borderBottom: '0.5px solid var(--color-card-border)', cursor: 'pointer' }}
                  onClick={() => router.push(`/hr/leaves/${leave.id}`)}
                >
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--icon-pill-blue-bg)', color: 'var(--icon-pill-blue-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                        {getInitials(leave.employee?.displayName ?? 'U')}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)' }}>{leave.employee?.displayName}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-heading)' }}>
                    {formatDateRange(leave.startDate, leave.endDate)}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-heading)' }}>{leave.totalDays}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <LeaveStatusBadge status={leave.status} />
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-muted)' }}>
                    {format(parseISO(leave.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <span style={{ fontSize: 12, color: 'var(--icon-pill-blue-stroke)', fontWeight: 500 }}>View →</span>
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
