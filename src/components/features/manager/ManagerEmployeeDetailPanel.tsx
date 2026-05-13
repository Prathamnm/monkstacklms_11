'use client'

import React, { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import type { Role } from '@/types/auth'
import type { EmployeeWithAvailability } from '@/types/employee'

const TABS = ['Personal Details', 'Work Details', 'Leave Log'] as const
type Tab = typeof TABS[number]

export function ManagerEmployeeDetailPanel({ employee }: { employee: EmployeeWithAvailability }) {
  const { instance } = useMsal()
  const [activeTab, setActiveTab] = useState<Tab>('Personal Details')

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

  if (isLoading || !data) {
    return (
      <div className="p-10 flex flex-col items-center justify-center bg-slate-50/30">
        <div className="w-6 h-6 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading team member records...</p>
      </div>
    )
  }

  const { leaveBalance: balance, leaveRequests: leaves } = data

  return (
    <div className="bg-slate-50/80 border-t border-[var(--color-card-border)] overflow-hidden">
      <div className="flex border-b border-[var(--color-card-border)] px-8 bg-white/60 backdrop-blur-md">
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
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-heading)]'
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="manager-tab-indicator" className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-blue-600" />
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            >
              <DetailItem label="Full Name" value={data.displayName} />
              <DetailItem label="Work Email" value={data.workEmail} className="text-blue-600" />
              <DetailItem label="Job Title" value={data.jobTitle} />
              <DetailItem label="Phone Number" value={data.phoneNumber} />
              <DetailItem label="Join Date" value={data.joinDate ? format(new Date(data.joinDate), 'MMM d, yyyy') : null} />
              <DetailItem label="Notification Email" value={data.notificationEmail} />
              
              <div className="col-span-full mt-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-[var(--color-card-border)] rounded-2xl p-6 shadow-sm">
                  <DetailItem label="Name" value={data.emergencyName} />
                  <DetailItem label="Relation" value={data.emergencyRelation} />
                  <DetailItem label="Phone" value={data.emergencyPhone} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Work Details' && (
            <motion.div
              key="work"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-10"
            >
              <div>
                <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold">Role</p>
                <span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', ROLE_COLORS[data.role as Role])}>
                  {ROLE_LABELS[data.role as Role]}
                </span>
              </div>
              <DetailItem label="Reporting Manager" value={data.manager?.displayName || 'Unassigned'} />
              <div>
                <p className="text-[11px] text-slate-400 mb-2 uppercase font-bold">Employment Status</p>
                <span className={cn(
                  'inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest',
                  data.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {data.employmentStatus}
                </span>
              </div>
            </motion.div>
          )}

          {activeTab === 'Leave Log' && (
            <motion.div
              key="leave"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <BalanceCard label="Standard Available" value={balance?.availableStandard} />
                <BalanceCard label="Emergency Total" value={balance?.emergencyTotal} />
                <BalanceCard label="Emergency Used" value={balance?.emergencyUsed} />
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Recent Leave History</h4>
                {leaves && leaves.length > 0 ? (
                  <div className="bg-white border border-[var(--color-card-border)] rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Duration</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Days</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {leaves.slice(0, 5).map((l: any) => (
                          <tr key={l.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-[var(--color-heading)]">
                              {format(new Date(l.startDate), 'dd MMM')} - {format(new Date(l.endDate), 'dd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{l.totalDays}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest',
                                l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                l.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              )}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-sm font-medium text-slate-400">No leave requests found for this employee.</p>
                  </div>
                )}
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
