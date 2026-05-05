'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { motion, AnimatePresence } from 'framer-motion'

interface CreateHolidayModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateHolidayModal({ isOpen, onClose }: CreateHolidayModalProps) {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', date: '', type: 'PUBLIC' as 'PUBLIC' | 'FLOATER', notes: '' })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/holidays', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create holiday')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicHolidays'] })
      setForm({ name: '', date: '', type: 'PUBLIC', notes: '' })
      setError(null)
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.date || !form.type) {
      setError('Name, date and type are required')
      return
    }
    setError(null)
    mutation.mutate()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Create Holiday</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">Holiday Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Republic Day"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2">Type *</label>
                  <div className="flex gap-4">
                    {(['PUBLIC', 'FLOATER'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input
                          type="radio"
                          name="type"
                          value={t}
                          checked={form.type === t}
                          onChange={() => setForm({ ...form, type: t })}
                          className="text-blue-600"
                        />
                        {t === 'PUBLIC' ? '🔴 Public' : '🟡 Floater'}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {mutation.isPending ? 'Creating...' : 'Create Holiday'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
