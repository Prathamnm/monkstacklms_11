'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmployeeCard } from '@/components/employee/EmployeeCard'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { cn } from '@/lib/utils/cn'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import type { EmployeeWithAvailability } from '@/types/employee'
import type { Role } from '@/types/auth'

function ManagerEmployeeSlideOver({
  employee,
  onClose,
}: {
  employee: EmployeeWithAvailability
  onClose: () => void
}) {
  const { instance } = useMsal()

  const { data, isLoading } = useQuery({
    queryKey: ['managerEmployeeDetail', employee.id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/employees/${employee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch details')
      return res.json()
    },
  })

  const { data: balanceData } = useQuery({
    queryKey: ['leaveBalance', 'subordinate', employee.id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/leave/balance?employeeId=${encodeURIComponent(employee.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!employee.id,
  })

  const balance = balanceData ?? data?.leaveBalance

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.35)',
          zIndex: 50,
        }}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(420px, 100vw)',
          background: 'var(--color-card-bg)',
          borderLeft: '1px solid var(--color-card-border)',
          zIndex: 60,
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-heading)', margin: 0 }}>Profile</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'var(--color-page-bg)',
              border: '1px solid var(--color-card-border)',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: 'var(--color-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {isLoading || !data ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Name
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-heading)' }}>{data.displayName}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Email
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-heading)' }}>{data.workEmail ?? '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Job title
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-heading)' }}>{data.jobTitle || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Role
                </p>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded font-medium',
                    ROLE_COLORS[data.role as Role]
                  )}
                >
                  {ROLE_LABELS[data.role as Role]}
                </span>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Availability
                </p>
                <AvailabilityBadge status={employee.availabilityStatus} />
              </div>
              <div
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: 12,
                  padding: '16px 18px',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Leave balance
                </p>
                {balance ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--color-heading)' }}>
                    <p>
                      Standard available:{' '}
                      <strong>
                        {typeof balance.effectiveAvailable === 'number'
                          ? balance.effectiveAvailable
                          : balance.availableStandard ?? '—'}
                      </strong>
                    </p>
                    {balance.availableEmergency != null && (
                      <p>
                        Emergency: <strong>{balance.availableEmergency}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Balance not available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

export default function ManagerEmployeesPage() {
  const { instance } = useMsal()
  const [modalEmployee, setModalEmployee] = useState<EmployeeWithAvailability | null>(null)
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery<EmployeeWithAvailability[]>({
    queryKey: ['managerEmployees'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const hay = [e.displayName, e.workEmail, e.jobTitle, e.firstName, e.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [employees, search])

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
      <PageHeader
        title="Team Monkstack"
        description="All active team members and their records."
        badge={filtered.length}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 400,
          background: 'var(--color-card-bg)',
          border: '1px solid var(--color-card-border)',
          borderRadius: 12,
          padding: '10px 14px',
        }}
      >
        <Search size={18} color="var(--color-muted)" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or title…"
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

      {isLoading ? (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: 24 }}>
          <TableSkeleton />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState icon="👤" title="No team members" description="No active employees are available to list." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔎" title="No matches" description="Try a different search term." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} onClick={() => setModalEmployee(emp)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalEmployee && (
          <ManagerEmployeeSlideOver employee={modalEmployee} onClose={() => setModalEmployee(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
