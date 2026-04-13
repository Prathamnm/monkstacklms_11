'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'

interface OnboardForm {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  designation: string
  role: string
  joinDate: string
  managerId: string
}

const initialForm: OnboardForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  designation: '',
  role: 'EMPLOYEE',
  joinDate: new Date().toISOString().slice(0, 10),
  managerId: '',
}

export default function OnboardPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const [form, setForm] = useState<OnboardForm>(initialForm)
  const [emailError, setEmailError] = useState('')

  const { data: managers = [] } = useQuery({
    queryKey: ['managersForOnboard'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      const all = await res.json()
      return all.filter((e: any) => e.role === 'MANAGER')
    },
  })

  function validateEmail(email: string): boolean {
    if (!email.endsWith('@monikajadhav1907gmail.onmicrosoft.com')) {
      setEmailError('Email must end with @monikajadhav1907gmail.onmicrosoft.com')
      return false
    }
    setEmailError('')
    return true
  }

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
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phoneNumber: form.phoneNumber,
          designation: form.designation,
          role: form.role,
          startDate: form.joinDate,
          managerId: form.managerId || null,
        }),
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

      <div className="flex justify-center">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-5 shadow-sm">
            <h3 className="text-slate-900 font-semibold text-base border-b border-slate-100 pb-3">
              New Employee Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
                <input
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Priya"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
                <input
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Sharma"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => { updateField('email', e.target.value); if (e.target.value) validateEmail(e.target.value) }}
                  className="input w-full"
                  placeholder="e.g. priya@monikajadhav1907gmail.onmicrosoft.com"
                />
                {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  className="input w-full"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Designation *</label>
                <input
                  value={form.designation}
                  onChange={(e) => updateField('designation', e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Software Developer Intern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => updateField('role', e.target.value)}
                  className="input w-full"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {(form.role === 'EMPLOYEE' || form.role === 'HR') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Reporting To <span className="text-slate-400 text-xs">(Manager)</span>
                  </label>
                  <select
                    value={form.managerId}
                    onChange={(e) => updateField('managerId', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">— Select reporting manager —</option>
                    {managers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Join Date *</label>
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => updateField('joinDate', e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  if (validateEmail(form.email)) {
                    onboardMutation.mutate()
                  }
                }}
                disabled={onboardMutation.isPending || !form.firstName || !form.email || !form.designation}
                className="btn-primary disabled:opacity-50"
              >
                {onboardMutation.isPending ? 'Onboarding...' : 'Onboard Employee'}
              </button>
              <button onClick={() => router.back()} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
