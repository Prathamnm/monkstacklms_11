'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft } from 'lucide-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/constants/roles'
import { motion, AnimatePresence } from 'framer-motion'
import { PersonalInfoTab } from '@/components/features/hr/employee-details/PersonalInfoTab'
import { WorkDetailsTab } from '@/components/features/hr/employee-details/WorkDetailsTab'
import { LeaveLogTab } from '@/components/features/hr/employee-details/LeaveLogTab'
import { UpdateDetailsTab } from '@/components/features/hr/employee-details/UpdateDetailsTab'
import { cn } from '@/lib/utils/cn'

const TABS = ['Personal Details', 'Work Details', 'Leave Log', 'Update Details'] as const
type Tab = typeof TABS[number]

export default function HREmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Personal Details')

  const { data, isLoading } = useQuery({
    queryKey: ['hrEmployee', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [empRes, leavesRes] = await Promise.all([
        fetch(`/api/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/hr/leaves?employeeId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      
      if (!empRes.ok) throw new Error('Employee not found')
      
      const employee = await empRes.json()
      const leaves = await leavesRes.json()
      return {
        employee,
        leaves: Array.isArray(leaves) ? leaves : [],
        balance: employee.leaveBalance
      }
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
    if (data?.employee) {
      setEditForm({
        emergencyName: data.employee.emergencyName ?? '',
        emergencyRelation: data.employee.emergencyRelation ?? '',
        emergencyPhone: data.employee.emergencyPhone ?? '',
        notificationEmail: data.employee.notificationEmail ?? '',
        employmentStatus: data.employee.employmentStatus ?? 'ACTIVE',
      })
    }
  }, [data?.employee])

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
    <motion.div 
      initial={{ opacity: 0, x: -8 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.25 }} 
      className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen flex flex-col gap-6"
    >
      <button 
        onClick={() => router.push('/hr/employees')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-2 transition-colors w-fit"
      >
        <ArrowLeft size={16} /> Back to Directory
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-5 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
          {getInitials(employee.displayName)}
        </div>
        <div>
          <h2 className="text-slate-900 font-bold text-xl tracking-tight">{employee.displayName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{employee.jobTitle || 'Employee'}</span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest border", ROLE_COLORS[employee.role as Role] || 'bg-slate-100 text-slate-600 border-slate-200')}>
              {ROLE_LABELS[employee.role as Role] || employee.role}
            </span>
            <AvailabilityBadge status={employee.availabilityStatus} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="flex border-b border-slate-200 px-8 bg-slate-50/50">
          {TABS.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-4 text-[13px] font-bold border-b-2 transition-all relative",
                activeTab === tab 
                  ? "border-blue-600 text-blue-600 bg-white" 
                  : "border-transparent text-slate-400 hover:text-slate-700"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="hr-detail-tab" className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'Personal Details' && <PersonalInfoTab data={employee} />}
              {activeTab === 'Work Details' && <WorkDetailsTab data={employee} />}
              {activeTab === 'Leave Log' && <LeaveLogTab balance={balance} leaves={leaves} />}
              {activeTab === 'Update Details' && (
                <UpdateDetailsTab 
                  editForm={editForm} 
                  setEditForm={setEditForm} 
                  isPending={updateMutation.isPending} 
                  onSave={() => updateMutation.mutate()} 
                  onCancel={() => setActiveTab('Personal Details')}
                  isTerminated={employee.employmentStatus === 'TERMINATED'}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
