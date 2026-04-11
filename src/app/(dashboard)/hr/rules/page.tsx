'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { AlertTriangle, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import type { AccrualRule } from '@/types/leave'

export default function HRRulesPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Partial<AccrualRule>>({})

  const { data: rule, isLoading } = useQuery<AccrualRule>({
    queryKey: ['accrualRules'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/rules', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load rules')
      return res.json()
    },
  })

  useEffect(() => {
    if (rule) setForm(rule)
  }, [rule])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/rules', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save rules')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Accrual rules updated')
      queryClient.invalidateQueries({ queryKey: ['accrualRules'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageSkeleton />

  const update = (key: keyof AccrualRule, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Accrual Rules" description="Configure leave accrual and carry-forward policy" />

      {/* Warning */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-amber-800 text-sm">
          <strong>Important:</strong> Changing these rules affects ALL employees from the effective date.
          A re-calculation of balances may be needed after changes.
        </p>
      </div>

      <div className="max-w-xl bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Standard Leaves/Year</label>
            <input
              type="number"
              value={form.standardLeavesPerYear ?? 18}
              onChange={(e) => update('standardLeavesPerYear', parseFloat(e.target.value))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Emergency Leaves/Year</label>
            <input
              type="number"
              value={form.emergencyLeavesPerYear ?? 2}
              onChange={(e) => update('emergencyLeavesPerYear', parseFloat(e.target.value))}
              className="input w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Accrual Method</label>
          <select
            value={form.accrualMethod ?? 'MONTHLY'}
            onChange={(e) => update('accrualMethod', e.target.value)}
            className="input w-full"
          >
            <option value="MONTHLY">Monthly (1.5 days/month)</option>
            <option value="ANNUAL">Annual (all at start of year)</option>
          </select>
        </div>

        {form.accrualMethod === 'MONTHLY' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Days Per Month</label>
            <input
              type="number"
              step="0.5"
              value={form.daysPerMonth ?? 1.5}
              onChange={(e) => update('daysPerMonth', parseFloat(e.target.value))}
              className="input w-full"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Carry-Forward Enabled</p>
            <p className="text-xs text-slate-500">Unused leave carries over to next year</p>
          </div>
          <button
            onClick={() => update('carryForwardEnabled', !form.carryForwardEnabled)}
            className={`w-10 h-6 rounded-full transition-all ${form.carryForwardEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span
              className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${form.carryForwardEnabled ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {form.carryForwardEnabled && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Maximum Carry-Forward Days</label>
            <input
              type="number"
              value={form.carryForwardMaxDays ?? 10}
              onChange={(e) => update('carryForwardMaxDays', parseFloat(e.target.value))}
              className="input w-full"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Effective From</label>
          <input
            type="date"
            value={form.effectiveFrom ? form.effectiveFrom.toString().slice(0, 10) : ''}
            onChange={(e) => update('effectiveFrom', e.target.value)}
            className="input w-full"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </div>
    </div>
  )
}
