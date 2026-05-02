'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Download, Search } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmployeeCard } from '@/components/employee/EmployeeCard'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportEmployeesModal } from '@/components/hr/ExportEmployeesModal'
import { motion } from 'framer-motion'
import type { EmployeeWithAvailability } from '@/types/employee'

export default function HREmployeesPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['hrEmployees'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees as EmployeeWithAvailability[]
    return (employees as EmployeeWithAvailability[]).filter((e) => {
      const hay = [e.displayName, e.workEmail, e.jobTitle, e.firstName, e.lastName, e.managerName]
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
        description="Manage your workforce and oversee roles. Employee data is synced from Azure."
        badge={filtered.length}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setIsExportModalOpen(true)} className="btn-secondary flex items-center gap-2">
              <Download size={16} /> Download Data
            </button>
          </div>
        }
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
          aria-label="Search employees"
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
        <EmptyState icon="👤" title="No employees found" description="User creation happens in Azure Entra ID." />
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
          {filtered.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => router.push(`/hr/employees/${employee.id}`)}
            />
          ))}
        </div>
      )}

      <ExportEmployeesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        totalCount={employees.length}
      />
    </motion.div>
  )
}
