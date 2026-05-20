'use client'

import React, { useState, useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { cn } from '@/lib/utils/cn'
import type { EmployeeWithAvailability } from '@/types/employee'
import { PersonalInfoTab } from './employee-details/PersonalInfoTab'
import { WorkDetailsTab } from './employee-details/WorkDetailsTab'
import { LeaveLogTab } from './employee-details/LeaveLogTab'
import { UpdateDetailsTab } from './employee-details/UpdateDetailsTab'

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
    timeZone: 'UTC',
  })

  useEffect(() => {
    if (data) {
      setEditForm({
        emergencyName: data.emergencyName ?? '',
        emergencyRelation: data.emergencyRelation ?? '',
        emergencyPhone: data.emergencyPhone ?? '',
        notificationEmail: data.notificationEmail ?? '',
        employmentStatus: data.employmentStatus ?? 'ACTIVE',
        timeZone: data.timeZone ?? 'UTC',
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
    <div className="bg-slate-50/80 border-t border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200 px-8 bg-white/60 backdrop-blur-md sticky top-0 z-10">
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
                : 'border-transparent text-slate-400 hover:text-slate-900'
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Personal Details' && <PersonalInfoTab data={data} />}
            {activeTab === 'Work Details' && <WorkDetailsTab data={data} />}
            {activeTab === 'Leave Log' && <LeaveLogTab balance={data.leaveBalance} leaves={data.leaves || []} />}
            {activeTab === 'Update Details' && (
              <UpdateDetailsTab 
                editForm={editForm} 
                setEditForm={setEditForm} 
                isPending={updateMutation.isPending} 
                onSave={() => updateMutation.mutate()} 
                onCancel={() => setActiveTab('Personal Details')}
                isTerminated={data.employmentStatus === 'TERMINATED'}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
