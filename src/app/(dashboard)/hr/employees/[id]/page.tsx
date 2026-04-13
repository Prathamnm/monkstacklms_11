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
    phoneNumber?: string | null, 
    emergencyContact?: string | null, 
    designation?: string | null,
    manager?: { id: string; displayName: string } | null,
    managerId?: string | null,
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

  const { data: managers = [] } = useQuery({
    queryKey: ['availableManagers'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees?role=MANAGER,ADMIN', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    }
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
    designation: '', phoneNumber: '', emergencyContact: '', managerId: '', role: '', employmentStatus: ''
  })
  
  useEffect(() => {
    if (data?.employee) {
      setEditForm({
        designation: data.employee.designation ?? '',
        phoneNumber: data.employee.phoneNumber ?? '',
        emergencyContact: data.employee.emergencyContact ?? '',
        managerId: data.employee.managerId ?? '',
        role: data.employee.role ?? '',
        employmentStatus: data.employee.employmentStatus ?? '',
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
      setActiveTab('Work Details')
    }
  })

  if (isLoading) return <PageSkeleton />
  if (!data) return null

  const { employee, leaves, balance } = data

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8">
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
            <button key={tab} onClick={() => {
              setActiveTab(tab)
              // Reset edit form when entering update tab
              if (tab === 'Update Details') {
                setEditForm({
                  designation: employee.designation ?? '',
                  phoneNumber: employee.phoneNumber ?? '',
                  emergencyContact: employee.emergencyContact ?? '',
                  managerId: employee.managerId ?? '',
                  role: employee.role,
                  employmentStatus: employee.employmentStatus
                })
              }
            }}
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
                  <div><p className="text-xs text-slate-400 mb-1">Email</p><p className="font-medium text-slate-900">{employee.email}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Phone Number</p><p className="font-medium text-slate-900">{employee.phoneNumber || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Emergency Contact</p><p className="font-medium text-slate-900">{employee.emergencyContact || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Join Date</p><p className="font-medium text-slate-900">{format(parseISO(employee.joinDate), 'MMM d, yyyy')}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Entra Object ID</p><p className="font-mono text-xs text-slate-500">{employee.entraObjectId}</p></div>
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
                  <div><p className="text-xs text-slate-400 mb-1">Designation</p><p className="font-medium text-slate-900">{employee.designation || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Employment Status</p>
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${employee.employmentStatus==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>{employee.employmentStatus}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Leave Log' && (
              <motion.div key="l-log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                
                {/* Balance Summary Card inside Tab */}
                {balance ? (
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div><p className="text-xs text-slate-500 mb-1">Available Standard</p><p className="text-2xl font-bold text-slate-900">{balance.standardTotal + balance.standardCarryForward - balance.standardUsed}</p></div>
                    <div><p className="text-xs text-slate-500 mb-1">Available Emergency</p><p className="text-2xl font-bold text-slate-900">{balance.emergencyTotal - balance.emergencyUsed}</p></div>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-2xl">Leave balance not initialized</div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Leave History</h3>
                  {leaves.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">No leave requests found.</div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                          <tr><th className="p-3 font-medium">Period</th><th className="p-3 font-medium">Days</th><th className="p-3 font-medium">Status</th></tr>
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
              <motion.div key="u-details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
                <div className="grid grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Designation</label>
                    <input className="w-full input" value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} placeholder="e.g. Senior Software Engineer" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Phone Number</label>
                    <input className="w-full input" value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Emergency Contact</label>
                    <input className="w-full input" value={editForm.emergencyContact} onChange={e => setEditForm({...editForm, emergencyContact: e.target.value})} />
                  </div>
                  
                  <div className="col-span-2 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Access & Hierarchy</h3>
                  </div>

                  <div>
                     <label className="text-xs font-semibold text-slate-700 mb-1 block">Reporting Manager</label>
                     <select className="w-full input" value={editForm.managerId} onChange={e => setEditForm({...editForm, managerId: e.target.value})}>
                       <option value="">Unassigned</option>
                       {managers.filter((m: any) => m.id !== employee.id).map((m: any) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-slate-700 mb-1 block">System Role</label>
                     <select className="w-full input" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                       <option value="EMPLOYEE">Employee</option>
                       <option value="MANAGER">Manager</option>
                       <option value="HR">HR</option>
                       <option value="ADMIN">Admin</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-slate-700 mb-1 block">Employment Status</label>
                     <select className="w-full input" disabled={employee.employmentStatus === 'TERMINATED'} value={editForm.employmentStatus} onChange={e => setEditForm({...editForm, employmentStatus: e.target.value})}>
                       <option value="ACTIVE">Active</option>
                       <option value="INACTIVE">Inactive</option>
                       <option value="TERMINATED">Terminated</option>
                     </select>
                     {employee.employmentStatus === 'TERMINATED' && <p className="text-xs text-red-500 mt-1">Status cannot be changed from TERMINATED here. Use reactivate.</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} 
                    className="btn-primary">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
