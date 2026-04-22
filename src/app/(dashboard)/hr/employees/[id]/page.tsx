'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { formatDateRange } from '@/lib/utils/dateUtils'
import { motion, AnimatePresence } from 'framer-motion'
import type { EmployeeWithAvailability } from '@/types/employee'
import type { LeaveRequest } from '@/types/leave'

const TABS = ['Personal Details', 'Work Details', 'Leave Log', 'Update Details'] as const
type Tab = typeof TABS[number]

interface EmployeeDetail {
  employee: EmployeeWithAvailability & {
    phoneNumber?:       string | null
    emergencyName?:     string | null
    emergencyRelation?: string | null
    emergencyPhone?:    string | null
    manager?:           { id: string; displayName: string } | null
    managerId?:         string | null
  }
  leaves: LeaveRequest[]
  balance: any
}

export default function HREmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Personal Details')

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployeesForManagerDropdown'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch employees')
      return res.json()
    },
  })

  const { data, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ['hrEmployee', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [empRes, leavesRes] = await Promise.all([
        fetch(`/api/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/hr/leaves?employeeId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const employee = await empRes.json()
      const leaves = await leavesRes.json()
      return {
        employee,
        leaves: Array.isArray(leaves) ? leaves : [],
        balance: employee.leaveBalance
      }
    },
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    emergencyName:     '',
    emergencyRelation: '',
    emergencyPhone:    '',
    notificationEmail: '',
    employmentStatus:  '',
  })

  useEffect(() => {
    if (data?.employee) {
      setEditForm({
        emergencyName:     data.employee.emergencyName     ?? '',
        emergencyRelation: data.employee.emergencyRelation ?? '',
        emergencyPhone:    data.employee.emergencyPhone    ?? '',
        notificationEmail: data.employee.notificationEmail ?? '',
        employmentStatus:  data.employee.employmentStatus  ?? 'ACTIVE',
      })
    }
  }, [data?.employee?.id])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrEmployee', id] })
      setActiveTab('Personal Details')
    }
  })

  if (isLoading) return <PageSkeleton />
  if (!data) return null

  const { employee, leaves, balance } = data

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-4 lg:p-6">
      <button onClick={() => router.push('/hr/employees')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Team Monkstack
      </button>

      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-5 shadow-sm mb-6">
        <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
          {getInitials(employee.displayName)}
        </div>
        <div>
          <h2 className="text-slate-900 font-bold text-xl">{employee.displayName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500 text-sm">{employee.jobTitle ?? 'Employee'}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[employee.role]}`}>
              {ROLE_LABELS[employee.role]}
            </span>
            <AvailabilityBadge status={employee.availabilityStatus} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="flex border-b border-slate-200 px-4 bg-slate-50">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab ? 'border-purple-600 text-purple-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'Personal Details' && (
              <motion.div key="p-details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Personal Identity</h3>
                <div className="grid grid-cols-2 gap-y-6">
                  <div><p className="text-xs text-slate-400 mb-1">Full Name</p><p className="font-medium text-slate-900">{employee.displayName}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Work Email</p><a href={`mailto:${employee.workEmail}`} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium" onClick={e => e.stopPropagation()}>{employee.workEmail}</a></div>
                  <div><p className="text-xs text-slate-400 mb-1">Job Title</p><p className="font-medium text-slate-900">{employee.jobTitle || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Phone Number</p><p className="font-medium text-slate-900">{employee.phoneNumber || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Join Date</p><p className="font-medium text-slate-900">{format(parseISO(employee.joinDate), 'MMM d, yyyy')}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Notification Email</p><p className="font-medium text-slate-900">{employee.notificationEmail || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Entra Object ID</p><p className="font-mono text-xs text-slate-500">{employee.entraObjectId}</p></div>

                  {/* Emergency Contact — full-width 3-column card */}
                  <div className="col-span-2 mt-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Emergency Contact</p>
                    <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Name</p>
                        <p className="font-medium text-slate-900">{employee.emergencyName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Relation</p>
                        <p className="font-medium text-slate-900">{employee.emergencyRelation || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Phone</p>
                        <p className="font-medium text-slate-900">{employee.emergencyPhone || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Work Details' && (
              <motion.div key="w-details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Work Assignment</h3>
                <div className="grid grid-cols-2 gap-y-6">
                  <div><p className="text-xs text-slate-400 mb-1">Role</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[employee.role]}`}>{ROLE_LABELS[employee.role]}</span>
                  </div>
                  <div><p className="text-xs text-slate-400 mb-1">Reporting Manager</p><p className="font-medium text-slate-900">{employee.manager?.displayName || 'Unassigned'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Job Title</p><p className="font-medium text-slate-900">{employee.jobTitle || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Employment Status</p>
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${employee.employmentStatus==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>{employee.employmentStatus}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Leave Log' && (
              <motion.div key="l-log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {balance ? (
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div><p className="text-xs text-slate-500 mb-1">Standard Remaining</p><p className="text-2xl font-bold text-slate-900">{balance.standardTotal + balance.standardCarryForward - balance.standardUsed}</p></div>
                    <div><p className="text-xs text-slate-500 mb-1">Floater Remaining</p><p className="text-2xl font-bold text-slate-900">{ (balance.floaterTotal ?? 2) - (balance.floaterUsed ?? 0) }</p></div>
                    <div><p className="text-xs text-slate-500 mb-1">Emergency Remaining</p><p className="text-2xl font-bold text-slate-900">{balance.emergencyTotal - balance.emergencyUsed}</p></div>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-2xl">Leave balance not initialized</div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Leave History</h3>
                  {leaves.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">No leave requests found.</div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                          <tr><th className="p-3">Period</th><th className="p-3">Days</th><th className="p-3">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {leaves.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50">
                              <td className="p-3">{formatDateRange(l.startDate, l.endDate)}</td>
                              <td className="p-3">{l.totalDays}</td>
                              <td className="p-3"><LeaveStatusBadge status={l.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'Update Details' && (
              <motion.div key="u-details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl">
                {/* Azure read-only notice */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800 mb-6">
                  <span className="flex-shrink-0 mt-0.5">ℹ️</span>
                  <span>
                    Name, job title, phone, manager, and join date are managed in <strong>Azure Entra ID</strong>
                    and updated automatically on login. Only emergency contact, employment status, and notification email can be edited here.
                  </span>
                </div>

                {/* Emergency Contact */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Contact Name</label>
                      <input className="w-full input" placeholder="e.g. Jane Doe"
                        value={editForm.emergencyName}
                        onChange={e => setEditForm({ ...editForm, emergencyName: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Relation</label>
                      <input className="w-full input" placeholder="e.g. Spouse"
                        value={editForm.emergencyRelation}
                        onChange={e => setEditForm({ ...editForm, emergencyRelation: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Contact Phone</label>
                      <input className="w-full input" placeholder="+91-XXXXXXXXXX"
                        value={editForm.emergencyPhone}
                        onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })} />
                    </div>
                  </div>
                </div>
                {/* Notification Preference */}
                <div className="mb-6 pt-5 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">LMS Notification Channel</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Notification Email (Optional)</label>
                    <input
                      className="w-full input max-w-lg"
                      type="email"
                      placeholder="e.g. personal.email@gmail.com"
                      value={editForm.notificationEmail}
                      onChange={e => setEditForm({ ...editForm, notificationEmail: e.target.value })}
                    />
                    <p className="text-[11px] text-slate-500">
                      If set, all LMS alerts will go to this address. Defaults to work email if empty.
                    </p>
                  </div>
                </div>

                {/* Employment Status */}
                <div className="mb-6 pt-5 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Employment Status</h3>
                  <select
                    className="w-full input max-w-xs"
                    value={editForm.employmentStatus}
                    disabled={employee.employmentStatus === 'TERMINATED'}
                    onChange={e => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                  {employee.employmentStatus === 'TERMINATED' && (
                    <p className="text-xs text-red-600 mt-2">Terminated status cannot be changed.</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setActiveTab('Personal Details')} className="btn-secondary">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
