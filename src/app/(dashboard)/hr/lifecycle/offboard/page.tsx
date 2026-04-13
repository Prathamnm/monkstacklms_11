'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { motion } from 'framer-motion'

interface Employee { id: string; displayName: string; email: string; employmentStatus: string }

export default function OffboardPage() {
  const { instance } = useMsal()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [search, setSearch] = useState('')
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['activeEmployees'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees?status=ACTIVE', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch employees')
      return res.json()
    },
  })

  const filteredEmployees = employees.filter(e =>
    e.displayName.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) throw new Error('No employee selected')
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees/${selectedEmployee.id}/offboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminationDate, reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Offboarding failed')
      }
      return res.json()
    },
    onSuccess: () => { setSuccess(true); setError(null) },
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmployee) { setError('Please select an employee'); return }
    if (!reason.trim()) { setError('Please provide a reason'); return }
    if (!confirmed) { setError('Please confirm the offboarding'); return }
    setError(null)
    mutation.mutate()
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center max-w-md mx-auto">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-green-900 mb-2">Offboarding Complete</h2>
          <p className="text-sm text-green-700">{selectedEmployee?.displayName} has been successfully offboarded.</p>
          <button onClick={() => { setSuccess(false); setSelectedEmployee(null); setSearch(''); setReason(''); setConfirmed(false) }} className="mt-4 rounded-xl bg-green-700 text-white px-4 py-2 text-sm font-medium hover:bg-green-800 transition-colors">
            Offboard Another Employee
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Deboarding" description="Offboard an employee and revoke their system access." />
      <div className="flex justify-center">
        <div className="w-full max-w-xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium mb-6">
            ⚠️ This action is irreversible. The employee will be permanently terminated and their access revoked.
          </div>
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            {/* Employee search */}
            <div className="relative">
              <label className="text-xs font-medium text-slate-700">Search Employee *</label>
              <input
                type="text"
                value={selectedEmployee ? selectedEmployee.displayName : search}
                onChange={(e) => { setSearch(e.target.value); setSelectedEmployee(null) }}
                placeholder="Type to search active employees..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              {!selectedEmployee && search.length > 0 && filteredEmployees.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                  {filteredEmployees.map(emp => (
                    <button key={emp.id} type="button" onClick={() => { setSelectedEmployee(emp); setSearch('') }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <p className="font-medium text-slate-900">{emp.displayName}</p>
                      <p className="text-xs text-slate-500">{emp.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEmployee && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-center justify-between">
                <span className="font-medium">Selected: {selectedEmployee.displayName}</span>
                <button type="button" onClick={() => setSelectedEmployee(null)} className="text-xs text-slate-400 hover:text-red-500">✕ Clear</button>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-700">Termination Date *</label>
              <input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Reason *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
                placeholder="Provide a clear reason for offboarding..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600" />
              <span className="text-sm text-slate-700">I confirm this employee will be permanently offboarded and all their access will be revoked.</span>
            </label>

            {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={mutation.isPending || !selectedEmployee || !confirmed}
              className="w-full rounded-xl bg-red-600 text-white py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Processing...' : 'Confirm Offboarding'}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
