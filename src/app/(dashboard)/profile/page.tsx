'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { ROLE_COLORS, ROLE_LABELS } from '@/constants/roles'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'

function StatCard({ label, value, description }: { label: string; value: string | number; description?: string }) {
  return (
    <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-heading)' }}>{value}</p>
      {description && <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 8 }}>{description}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useCurrentUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (isLoading) return <PageSkeleton />
  if (isError || !data) return null

  const { user, balance } = data

  const leaveRouteMap: Record<string, string> = {
    EMPLOYEE: '/employee/apply-leave',
    MANAGER: '/manager/apply-leave',
    HR: '/hr/apply-leave',
    ADMIN: '/employee/apply-leave',
  }

  const dashboardRouteMap: Record<string, string> = {
    EMPLOYEE: '/employee/dashboard',
    MANAGER: '/manager/dashboard',
    HR: '/hr/dashboard',
    ADMIN: '/hr/dashboard',
  }

  const leavesRouteMap: Record<string, string> = {
    EMPLOYEE: '/employee/my-leaves',
    MANAGER: '/manager/my-leaves',
    HR: '/hr/my-leaves',
    ADMIN: '/employee/my-leaves',
  }

  const metrics = [
    {
      label: 'Standard Leave Remaining',
      value: balance.availableStandard,
      description: `${balance.standardTotal} total · ${balance.standardUsed} used`,
    },
    {
      label: 'Floater Leave Remaining',
      value: balance.availableFloater ?? 2,
      description: `${balance.floaterTotal ?? 2} total (included in standard) · ${balance.floaterUsed ?? 0} used`,
    },
    {
      label: 'Emergency Leave Remaining',
      value: balance.availableEmergency,
      description: `${balance.emergencyTotal} total · ${balance.emergencyUsed} used`,
    },
    {
      label: 'Pending Approval',
      value: balance.pendingDays,
      description: 'Days awaiting manager approval',
    },
  ]

  const profileFields = [
    { label: 'Email',               value: user.email },
    { label: 'Job Title',           value: user.jobTitle ?? '—' },
    { label: 'Role',                value: ROLE_LABELS[user.role] },
    { label: 'Phone',               value: user.phoneNumber ?? '—' },
    { label: 'Reporting Manager',   value: (user as any).manager?.displayName ?? 'Unassigned' },
    { label: 'Employment Status',   value: user.employmentStatus ?? '—' },
    { label: 'Join Date',           value: user.joinDate ? (() => { try { return format(new Date(user.joinDate as string), 'dd MMM yyyy') } catch { return '—' } })() : '—' },
  ]

  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const token = await getAccessToken(instance)
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Upload failed')
      }
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success('Profile photo updated')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to upload photo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <PageHeader title={`Welcome, ${firstName}`} description="Your personal details, leave summary, and quick actions." />

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }} className="lg:grid-cols-2 grid-cols-1">
        {/* Identity card */}
        <section style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar with upload overlay */}
            <div
              className="relative w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0 cursor-pointer group"
              onClick={() => !uploading && fileInputRef.current?.click()}
              title="Change photo"
            >
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : user.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                getInitials(user.displayName)
              )}
              {!uploading && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <Camera size={18} className="text-white" />
                  <span className="text-white text-[9px] font-medium mt-0.5">Change Photo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName}</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{user.jobTitle ?? 'Employee'}</p>
              <span className={`inline-flex mt-3 items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {/* Profile fields grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {profileFields.map((f) => (
                <div key={f.label}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-heading)', marginTop: 4, wordBreak: 'break-all' }}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* Emergency Contact */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '0.5px solid var(--color-card-border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Emergency Contact</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>Name</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{(user as any).emergencyName ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>Relation</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{(user as any).emergencyRelation ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>Phone</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{(user as any).emergencyPhone ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => router.push(leaveRouteMap[user.role])}
              style={{ background: 'var(--icon-pill-blue-stroke)', color: 'var(--icon-pill-blue-bg)', border: 'none', borderRadius: 9, padding: '12px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
              Request Leave
            </button>
            <button onClick={() => router.push(leavesRouteMap[user.role])}
              style={{ background: 'transparent', border: '0.5px solid var(--color-card-border)', color: 'var(--color-heading)', borderRadius: 9, padding: '12px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-page-bg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              View Leave History
            </button>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
          </div>

          <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 16 }}>Quick actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => router.push(dashboardRouteMap[user.role])}
                style={{ textAlign: 'left', background: 'transparent', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '16px 20px', fontSize: 13, fontWeight: 500, color: 'var(--color-heading)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-page-bg)'; e.currentTarget.style.borderColor = 'var(--icon-pill-blue-stroke)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-card-border)' }}>
                Go to Dashboard
              </button>
              <button onClick={() => router.push(leavesRouteMap[user.role])}
                style={{ textAlign: 'left', background: 'transparent', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '16px 20px', fontSize: 13, fontWeight: 500, color: 'var(--color-heading)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-page-bg)'; e.currentTarget.style.borderColor = 'var(--icon-pill-blue-stroke)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-card-border)' }}>
                View leave history
              </button>
              {user.role === 'EMPLOYEE' && (
                <button onClick={() => router.push('/employee/my-team')}
                  style={{ textAlign: 'left', background: 'transparent', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '16px 20px', fontSize: 13, fontWeight: 500, color: 'var(--color-heading)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-page-bg)'; e.currentTarget.style.borderColor = 'var(--icon-pill-blue-stroke)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-card-border)' }}>
                  See team availability
                </button>
              )}
              {user.role === 'HR' && (
                <button onClick={() => router.push('/hr/employees')}
                  style={{ textAlign: 'left', background: 'transparent', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '16px 20px', fontSize: 13, fontWeight: 500, color: 'var(--color-heading)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-page-bg)'; e.currentTarget.style.borderColor = 'var(--icon-pill-blue-stroke)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-card-border)' }}>
                  Manage employees
                </button>
              )}
              {user.role === 'HR' && (
                <button onClick={() => router.push('/hr/audit')}
                  style={{ textAlign: 'left', background: 'transparent', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '16px 20px', fontSize: 13, fontWeight: 500, color: 'var(--color-heading)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-page-bg)'; e.currentTarget.style.borderColor = 'var(--icon-pill-blue-stroke)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-card-border)' }}>
                  Open audit logs
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  )
}
