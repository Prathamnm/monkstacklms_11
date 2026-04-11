'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'

interface OnboardForm {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  jobTitle: string
  department: string
  role: string
  startDate: string
}

const initialForm: OnboardForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  department: '',
  role: 'EMPLOYEE',
  startDate: new Date().toISOString().slice(0, 10),
}

export default function OnboardPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [form, setForm] = useState<OnboardForm>(initialForm)

  const updateField = (key: keyof OnboardForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees/onboard', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to onboard employee')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Employee onboarded successfully!')
      router.push('/hr/employees')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <PageHeader title="Onboard New Employee" description="Set up a new employee account in Monkstack HRM" />

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-slate-900 font-semibold text-base border-b border-slate-100 pb-3">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
              <input value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="input w-full" placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
              <input value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} className="input w-full" placeholder="Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="input w-full" placeholder="john.smith@moonshine.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input value={form.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} className="input w-full" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title *</label>
              <input value={form.jobTitle} onChange={(e) => updateField('jobTitle', e.target.value)} className="input w-full" placeholder="Software Engineer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <input value={form.department} onChange={(e) => updateField('department', e.target.value)} className="input w-full" placeholder="Engineering" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
              <select value={form.role} onChange={(e) => updateField('role', e.target.value)} className="input w-full">
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} className="input w-full" />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => onboardMutation.mutate()}
              disabled={onboardMutation.isPending || !form.firstName || !form.email}
              className="btn-primary disabled:opacity-50"
            >
              {onboardMutation.isPending ? 'Onboarding...' : 'Onboard Employee'}
            </button>
            <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
