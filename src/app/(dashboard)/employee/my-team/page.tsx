'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Search, Users, CalendarOff, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import { startOfMonth } from 'date-fns'
import { loadEmployeeDirectory } from '@/lib/api/employeeDirectory'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmployeeCard } from '@/components/employee/EmployeeCard'
import { getInitials } from '@/lib/utils/formatters'

type ApiEmployee = {
  id: string
  displayName: string
  email: string
  role: 'EMPLOYEE' | 'MANAGER' | 'HR'
  jobTitle?: string | null
  profilePictureUrl?: string | null
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  availabilityStatus: 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM'
  createdAt?: string
}

function readErrMeta(err: unknown): { message: string; code?: string; status?: number } {
  if (!(err instanceof Error)) {
    return { message: 'Something went wrong' }
  }
  const e = err as Error & { code?: string; status?: number }
  return { message: e.message || 'Something went wrong', code: e.code, status: e.status }
}

export default function TeamMonkstackPage() {
  const router = useRouter()
  const { instance } = useMsal()
  const [search, setSearch] = useState('')
  const [fetchAttempt, setFetchAttempt] = useState(0)

  const { data: employees = [], isLoading, isError, error, isFetching } = useQuery<ApiEmployee[]>({
    queryKey: ['allEmployees', fetchAttempt],
    queryFn: async () => {
      const rows = await loadEmployeeDirectory(instance, { forceRefresh: fetchAttempt > 0 })
      return rows as ApiEmployee[]
    },
    placeholderData: keepPreviousData,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const hay = [e.displayName, e.email, e.jobTitle ?? '', e.role].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [employees, search])

  const onLeaveCount = employees.filter(
    (e) =>
      e.availabilityStatus === 'ON_LEAVE' ||
      e.availabilityStatus === 'HALF_DAY_AM' ||
      e.availabilityStatus === 'HALF_DAY_PM'
  ).length

  const thisMonthStart = startOfMonth(new Date()).toISOString()
  const joinedThisMonth = employees.filter((e) => e.createdAt && e.createdAt >= thisMonthStart).length

  const errMeta = isError ? readErrMeta(error) : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        padding: '24px 32px',
        background: 'var(--color-page-bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)', marginBottom: 20 }}>Team Monkstack</h2>

      <div style={{ display: 'flex', justifyContent: 'start', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            maxWidth: 384,
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 12,
            padding: '10px 14px',
          }}
          className="interactive-surface"
        >
          <Search size={18} color="var(--color-muted)" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            aria-label="Search team members"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              background: 'transparent',
              color: 'var(--color-heading)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 8 }}>
        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 16,
            padding: '24px 28px',
          }}
          className="card-hover"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--icon-pill-blue-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} color="var(--icon-pill-blue-stroke)" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginTop: 12, marginBottom: 4 }}>Total members</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-heading)', lineHeight: 1 }}>
            {isLoading ? '—' : employees.length}
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 16,
            padding: '24px 28px',
          }}
          className="card-hover"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--icon-pill-red-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarOff size={18} color="var(--icon-pill-red-stroke)" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginTop: 12, marginBottom: 4 }}>On leave today</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-heading)', lineHeight: 1 }}>
            {isLoading ? '—' : onLeaveCount}
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 16,
            padding: '24px 28px',
          }}
          className="card-hover"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--icon-pill-green-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserPlus size={18} color="var(--icon-pill-green-stroke)" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-heading)', marginTop: 12, marginBottom: 4 }}>Available Today</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-heading)', lineHeight: 1 }}>
            {isLoading ? '—' : employees.filter(e => e.availabilityStatus === 'AVAILABLE').length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, overflow: 'hidden' }}>
          <TableSkeleton />
        </div>
      ) : isError && errMeta ? (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '64px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-heading)', marginBottom: 4 }}>Could not load team</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16 }}>Directory query failed</p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => setFetchAttempt((n) => n + 1)}
            style={{
              padding: '8px 20px',
              border: '1px solid var(--color-card-border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-heading)',
              background: 'transparent',
              cursor: isFetching ? 'not-allowed' : 'pointer',
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : employees.length === 0 ? (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>No employees found</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>
            The directory is empty. An admin can import everyone from Microsoft Entra: POST{' '}
            <code className="text-xs">/api/hr/users/sync</code> (admin session or <code className="text-xs">x-sync-secret</code> cron).
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Requires server env: AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>No matches</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Try a different search term.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, overflow: 'hidden', marginTop: 24 }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-card-border)', background: 'var(--color-page-bg)' }}>
                <th className="text-xs font-semibold uppercase tracking-wider" style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}>Name</th>
                <th className="text-xs font-semibold uppercase tracking-wider" style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}>Email</th>
                <th className="text-xs font-semibold uppercase tracking-wider" style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}>Job Title</th>
                <th className="text-xs font-semibold uppercase tracking-wider" style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  style={{ borderBottom: '1px solid var(--color-card-border)', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-page-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'var(--icon-pill-blue-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--icon-pill-blue-stroke)',
                          fontSize: 14,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(emp.displayName)}
                      </div>
                      <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 13 }}>{emp.displayName}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <a
                      href={`mailto:${emp.email}`}
                      style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none' }}
                    >
                      {emp.email}
                    </a>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-heading)' }}>
                    {emp.jobTitle || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {emp.availabilityStatus === 'AVAILABLE' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: 'var(--status-approved-bg)', color: 'var(--status-approved-text)' }}>Available</span>
                    )}
                    {(emp.availabilityStatus === 'ON_LEAVE' || emp.availabilityStatus === 'HALF_DAY_AM' || emp.availabilityStatus === 'HALF_DAY_PM') && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' }}>On Leave</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
