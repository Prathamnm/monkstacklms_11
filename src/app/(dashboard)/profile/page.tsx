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
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
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
      className="p-4 lg:p-6 space-y-4"
    >
      <PageHeader title={`Welcome, ${firstName}`} description="Your personal details, leave summary, and quick actions." />

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
        {/* Identity card */}
        <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-4">
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
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-slate-900 truncate">{user.displayName}</p>
              <p className="text-slate-500 mt-1">{user.jobTitle ?? 'Employee'}</p>
              <span className={`inline-flex mt-3 items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {/* Profile fields grid */}
          <div className="mt-6 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {profileFields.map((f) => (
                <div key={f.label}>
                  <p className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">{f.label}</p>
                  <p className="mt-1 text-slate-900 break-all">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Emergency Contact */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Emergency Contact</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-900 font-medium">{(user as any).emergencyName ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Relation</span>
                  <span className="text-slate-900 font-medium">{(user as any).emergencyRelation ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="text-slate-900 font-medium">{(user as any).emergencyPhone ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button onClick={() => router.push(leaveRouteMap[user.role])}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Request Leave
            </button>
            <button onClick={() => router.push(leavesRouteMap[user.role])}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              View Leave History
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Quick actions</h2>
            <div className="grid gap-3">
              <button onClick={() => router.push(dashboardRouteMap[user.role])}
                className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                Go to Dashboard
              </button>
              <button onClick={() => router.push(leavesRouteMap[user.role])}
                className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                View leave history
              </button>
              {user.role === 'EMPLOYEE' && (
                <button onClick={() => router.push('/employee/my-team')}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  See team availability
                </button>
              )}
              {user.role === 'HR' && (
                <button onClick={() => router.push('/hr/employees')}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  Manage employees
                </button>
              )}
              {user.role === 'ADMIN' && (
                <button onClick={() => router.push('/hr/audit')}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
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
