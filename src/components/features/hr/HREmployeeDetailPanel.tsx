'use client'

import React, { useState, useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { Role } from '@/types/auth'
import type { EmployeeWithAvailability } from '@/types/employee'
import { HEADING_STYLES } from '@/constants/tailwind'

const TABS = ['Personal Details', 'Work Details', 'Leave Log', 'Update Details'] as const
type Tab = typeof TABS[number]

export function HREmployeeDetailPanel({ employee }: { employee: EmployeeWithAvailability }) {
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
      <div className="p-12 flex flex-col items-center justify-center bg-slate-50/30">
        <div className="w-8 h-8 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading comprehensive records...</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-50/80 border-t border-[var(--color-card-border)] overflow-hidden">
      <div className="flex border-b border-[var(--color-card-border)] px-8 bg-white/60 backdrop-blur-md sticky top-0 z-10">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab(tab)
            }}
            className={cn(
              'px-6 py-4 text-[13px] font-bold border-b-2 transition-all relative',
              activeTab === tab
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-heading)]'
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="hr-tab-indicator" className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-purple-600" />
            )}
          </button>
        ))}
      </div>

      <div className="p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'Personal Details' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <section>
                <h3 className={HEADING_STYLES.cardSubtitle + " mb-8 flex items-center gap-3 text-slate-500"}>
                  <span className="w-8 h-[1px] bg-slate-200" /> Identity & Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  <DetailItem label="Full Name" value={data.displayName} />
                  <DetailItem label="Work Email" value={data.workEmail} className="text-blue-600" />
                  <DetailItem label="Job Title" value={data.jobTitle} />
                  <DetailItem label="Phone Number" value={data.phoneNumber} />
                  <DetailItem label="Join Date" value={data.joinDate ? format(parseISO(data.joinDate), 'MMM d, yyyy') : null} />
                  <DetailItem label="Notification Email" value={data.notificationEmail} />
                  <DetailItem label="Entra Object ID" value={data.entraObjectId} className="col-span-full font-mono text-[11px] opacity-60" />
                </div>
              </section>

              <section>
                <h3 className={HEADING_STYLES.cardSubtitle + " mb-6 flex items-center gap-3 text-slate-500"}>
                  <span className="w-8 h-[1px] bg-slate-200" /> Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-[var(--color-card-border)] rounded-2xl p-6 shadow-sm">
                  <DetailItem label="Name" value={data.emergencyName} />
                  <DetailItem label="Relation" value={data.emergencyRelation} />
                  <DetailItem label="Phone" value={data.emergencyPhone} />
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'Work Details' && (
            <motion.div
              key="work"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h3 className={HEADING_STYLES.cardSubtitle + " mb-8 flex items-center gap-3 text-slate-500"}>
                <span className="w-8 h-[1px] bg-slate-200" /> Work Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold">Role</p>
                  <span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', ROLE_COLORS[data.role as Role])}>
                    {ROLE_LABELS[data.role as Role]}
                  </span>
                </div>
                <DetailItem label="Reporting Manager" value={data.manager?.displayName || 'Unassigned'} />
                <div>
                  <p className={HEADING_STYLES.cardSubtitle + " mb-2"}>Employment Status</p>
                  <span
                    className={cn(
                      'inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest',
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <BalanceCard label="Standard Total" value={data.leaveBalance?.standardTotal} />
                <BalanceCard label="Standard Used" value={data.leaveBalance?.standardUsed} />
                <BalanceCard label="Carry Forward" value={data.leaveBalance?.standardCarryForward} />
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 flex gap-3">
                <span>📅</span>
                <p>Historical logs are currently being migrated. Detailed history will be available in the next update.</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'Update Details' && (
            <motion.div
              key="update"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl space-y-10"
            >
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-sm text-blue-800 shadow-sm shadow-blue-50">
                <span className="text-xl">ℹ️</span>
                <p>
                  Identity fields are managed in <strong>Azure Entra ID</strong>.
                  Changes made here only affect internal LMS attributes like emergency contacts and employment status.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Emergency Contact Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <InputField 
                      placeholder="Contact Name" 
                      value={editForm.emergencyName} 
                      onChange={(val) => setEditForm({ ...editForm, emergencyName: val })} 
                    />
                    <InputField 
                      placeholder="Relation" 
                      value={editForm.emergencyRelation} 
                      onChange={(val) => setEditForm({ ...editForm, emergencyRelation: val })} 
                    />
                    <InputField 
                      placeholder="Phone Number" 
                      value={editForm.emergencyPhone} 
                      onChange={(val) => setEditForm({ ...editForm, emergencyPhone: val })} 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">System Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Notification Email</label>
                      <InputField 
                        type="email"
                        value={editForm.notificationEmail} 
                        onChange={(val) => setEditForm({ ...editForm, notificationEmail: val })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Employment Status</label>
                      <select
                        className="w-full rounded-xl border border-[var(--color-card-border)] px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none bg-white transition-all shadow-sm"
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

              <div className="flex gap-4 pt-8 border-t border-slate-100">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="bg-purple-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 disabled:opacity-50 active:scale-[0.98]"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setActiveTab('Personal Details')}
                  className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
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

function DetailItem({ label, value, className = '' }: { label: string, value: string | null, className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-tight">{label}</p>
      <p className="text-[14px] font-semibold text-slate-900 leading-snug">{value || '—'}</p>
    </div>
  )
}

function BalanceCard({ label, value }: { label: string, value: number | string | undefined }) {
  return (
    <div className="bg-white border border-[var(--color-card-border)] p-6 rounded-2xl shadow-sm">
      <p className="text-[10px] text-slate-400 mb-3 uppercase font-bold tracking-widest">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value ?? '—'}</p>
    </div>
  )
}

function InputField({ placeholder, value, onChange, type = 'text' }: { placeholder?: string, value: string, onChange: (v: string) => void, type?: string }) {
  return (
    <input
      type={type}
      className="w-full rounded-xl border border-[var(--color-card-border)] px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
