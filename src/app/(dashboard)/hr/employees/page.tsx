'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { Download, Search } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportEmployeesModal } from '@/components/hr/ExportEmployeesModal'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { Role } from '@/types/auth'
import type { EmployeeWithAvailability } from '@/types/employee'
import toast from 'react-hot-toast'

const TABS = ['Personal Details', 'Work Details', 'Leave Log', 'Update Details'] as const
type Tab = typeof TABS[number]

function HREmployeeDetailPanel({ employee }: { employee: EmployeeWithAvailability }) {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Personal Details')

  const { data, isLoading } = useQuery({
    queryKey: ['hrEmployeeDetail', employee.id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees/${employee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch details')
      return res.json()
    },
  })

  const [editForm, setEditForm] = useState({
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    notificationEmail: '',
    employmentStatus: '',
  })

  useEffect(() => {
    if (data) {
      setEditForm({
        emergencyName: data.emergencyName ?? '',
        emergencyRelation: data.emergencyRelation ?? '',
        emergencyPhone: data.emergencyPhone ?? '',
        notificationEmail: data.notificationEmail ?? '',
        employmentStatus: data.employmentStatus ?? 'ACTIVE',
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrEmployeeDetail', employee.id] })
      queryClient.invalidateQueries({ queryKey: ['hrEmployees'] })
      toast.success('Employee updated')
      setActiveTab('Personal Details')
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-slate-200 border-t-purple-600 rounded-full"
          />
          Loading records...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50/50 border-t border-slate-100 overflow-hidden">
      <div className="flex border-b border-slate-200/60 px-6 bg-white/50">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab(tab)
            }}
            className={cn(
              'px-5 py-3 text-[13px] font-medium border-b-2 transition-all',
              activeTab === tab
                ? 'border-purple-600 text-purple-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'Personal Details' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6">Personal Identity</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Full Name</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.displayName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Work Email</p>
                    <p className="text-[14px] font-semibold text-blue-600">{data.workEmail}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Job Title</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.jobTitle || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Phone Number</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.phoneNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Join Date</p>
                    <p className="text-[14px] font-semibold text-slate-900">
                      {data.joinDate ? format(parseISO(data.joinDate), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Notification Email</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.notificationEmail || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Entra Object ID</p>
                    <p className="text-[12px] font-mono text-slate-500">{data.entraObjectId}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-3 gap-6 bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Name</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.emergencyName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Relation</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.emergencyRelation || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Phone</p>
                    <p className="text-[14px] font-semibold text-slate-900">{data.emergencyPhone || '—'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Work Details' && (
            <motion.div
              key="work"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6">Work Assignment</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Role</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded font-medium', ROLE_COLORS[data.role as Role])}>
                    {ROLE_LABELS[data.role as Role]}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Reporting Manager</p>
                  <p className="text-[14px] font-semibold text-slate-900">{data.manager?.displayName || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 uppercase font-medium">Employment Status</p>
                  <span
                    className={cn(
                      'inline-block text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider',
                      data.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {data.employmentStatus}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Leave Log' && (
            <motion.div
              key="leave"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                  <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold tracking-tight">Standard Total</p>
                  <p className="text-3xl font-bold text-slate-900">{data.leaveBalance?.standardTotal ?? '—'}</p>
                </div>
                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                  <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold tracking-tight">Standard Used</p>
                  <p className="text-3xl font-bold text-slate-900">{data.leaveBalance?.standardUsed ?? '—'}</p>
                </div>
                <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                  <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold tracking-tight">Carry Forward</p>
                  <p className="text-3xl font-bold text-slate-900">{data.leaveBalance?.standardCarryForward ?? '—'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">Historical logs are being migrated to the inline view.</p>
            </motion.div>
          )}

          {activeTab === 'Update Details' && (
            <motion.div
              key="update"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="max-w-xl space-y-8"
            >
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                <span className="flex-shrink-0">ℹ️</span>
                <span>
                  Identity fields are managed in <strong>Azure Entra ID</strong>.
                  Only internal HR attributes can be modified here.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Emergency Contact</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                      placeholder="Contact Name"
                      value={editForm.emergencyName}
                      onChange={(e) => setEditForm({ ...editForm, emergencyName: e.target.value })}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                      placeholder="Relation"
                      value={editForm.emergencyRelation}
                      onChange={(e) => setEditForm({ ...editForm, emergencyRelation: e.target.value })}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                      placeholder="Phone"
                      value={editForm.emergencyPhone}
                      onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Notification Email</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                        type="email"
                        value={editForm.notificationEmail}
                        onChange={(e) => setEditForm({ ...editForm, notificationEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                      <select
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none bg-white"
                        value={editForm.employmentStatus}
                        onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="TERMINATED">Terminated</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setActiveTab('Personal Details')}
                  className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function HREmployeesPage() {
  const { instance } = useMsal()
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    const all = employees as any[]
    if (!q) return all
    return all.filter((e) => {
      const hay = [e.displayName, e.workEmail, e.jobTitle, e.firstName, e.lastName, e.managerName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [employees, search])

  const toggleExpand = (id: string) => {
    setSelectedId(selectedId === id ? null : id)
  }

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
        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <TableSkeleton />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState icon="👤" title="No employees found" description="User creation happens in Azure Entra ID." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔎" title="No matches" description="Try a different search term." />
      ) : (
        <div
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 16,
            overflow: 'hidden',
            marginTop: 8,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-card-border)', background: 'var(--color-page-bg)' }}>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}
                >
                  Name
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}
                >
                  Email
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}
                >
                  Job Title
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ textAlign: 'left', color: 'var(--color-muted)', padding: '12px 16px' }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <React.Fragment key={emp.id}>
                  <tr
                    onClick={() => toggleExpand(emp.id)}
                    style={{
                      borderBottom: '1px solid var(--color-card-border)',
                      transition: 'background-color 0.2s',
                      cursor: 'pointer',
                      background: selectedId === emp.id ? 'var(--color-page-bg)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedId !== emp.id) e.currentTarget.style.background = 'var(--color-page-bg)'
                    }}
                    onMouseLeave={(e) => {
                      if (selectedId !== emp.id) e.currentTarget.style.background = 'transparent'
                    }}
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
                        <p style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: 13 }}>{emp.displayName}</p>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: '#3b82f6', fontSize: 13 }}>{emp.workEmail || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-heading)' }}>
                      {emp.jobTitle || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <AvailabilityBadge status={emp.availabilityStatus} />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <AnimatePresence>
                        {selectedId === emp.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <HREmployeeDetailPanel employee={emp} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
