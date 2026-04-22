'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import type { SystemSetting } from '@/types/api'

const DEFAULT_SETTINGS = {
  company_name: 'Moonshine',
  min_advance_days: '1',
  working_days: 'MON,TUE,WED,THU,FRI',
  sender_email: 'no-reply@moonshine.onmicrosoft.com',
  notifications_enabled: 'true',
  email_notifications_enabled: 'true',
}

export default function AdminSettingsPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)

  const { data: settingsList = [] } = useQuery<SystemSetting[]>({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load settings')
      return res.json()
    },
  })

  useEffect(() => {
    if (settingsList.length > 0) {
      const mapped = settingsList.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      setSettings((prev) => ({ ...prev, ...mapped }))
    }
  }, [settingsList])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="p-4 lg:p-6">
      <PageHeader title="System Settings" description="Configure global system preferences" />

      <div className="max-w-xl bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
          <input
            value={settings.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Minimum Advance Notice (days)</label>
          <input
            type="number"
            value={settings.min_advance_days}
            onChange={(e) => update('min_advance_days', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Sender Address</label>
          <input
            type="email"
            value={settings.sender_email}
            onChange={(e) => update('sender_email', e.target.value)}
            className="input w-full"
          />
        </div>
        <div className="space-y-3">
          {[
            { key: 'notifications_enabled', label: 'Enable In-App Notifications' },
            { key: 'email_notifications_enabled', label: 'Enable Email Notifications' },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{toggle.label}</p>
              <button
                onClick={() => update(toggle.key, settings[toggle.key] === 'true' ? 'false' : 'true')}
                className={`w-10 h-6 rounded-full transition-all ${settings[toggle.key] === 'true' ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform ${settings[toggle.key] === 'true' ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
