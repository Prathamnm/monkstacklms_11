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
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader title="System Settings" description="Configure global system preferences" />

      <div style={{ maxWidth: 560, background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>Company Name</label>
          <input
            value={settings.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border-blue)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-card-border)' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>Minimum Advance Notice (days)</label>
          <input
            type="number"
            value={settings.min_advance_days}
            onChange={(e) => update('min_advance_days', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border-blue)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-card-border)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>Email Sender Address</label>
          <input
            type="email"
            value={settings.sender_email}
            onChange={(e) => update('sender_email', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border-blue)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-card-border)' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'notifications_enabled', label: 'Enable In-App Notifications' },
            { key: 'email_notifications_enabled', label: 'Enable Email Notifications' },
          ].map((toggle) => (
            <div key={toggle.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)' }}>{toggle.label}</p>
              <button
                onClick={() => update(toggle.key, settings[toggle.key] === 'true' ? 'false' : 'true')}
                style={{ width: 40, height: 22, borderRadius: 99, background: settings[toggle.key] === 'true' ? 'var(--icon-pill-blue-stroke)' : 'var(--color-card-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <span
                  style={{ display: 'block', width: 16, height: 16, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', position: 'absolute', top: 3, left: settings[toggle.key] === 'true' ? 20 : 2, transition: 'left 0.2s' }}
                />
              </button>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 8, borderTop: '0.5px solid var(--color-card-border)' }}>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{ background: 'var(--icon-pill-blue-stroke)', color: 'var(--icon-pill-blue-bg)', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saveMutation.isPending ? 0.6 : 1 }}
          >
            <Save size={15} />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
