'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Camera, ChevronRight, Briefcase, Mail, Phone, Calendar, UserCheck, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials, getCleanFirstName } from '@/lib/utils/formatters'
import { ROLE_COLORS, ROLE_LABELS } from '@/constants/roles'
import { getAccessToken } from '@/lib/auth/getAccessToken'

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
  const firstName = getCleanFirstName(user?.firstName, user?.displayName)

  const getBal = (type: string) => 
    balance.balances.find((b) => b.type === type) || { total: 0, consumed: 0, inApproval: 0 }

  const std = getBal('ANNUAL')
  const emg = getBal('EMERGENCY')
  const flt = getBal('FLOATER')

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!res.ok) throw new Error('Upload failed')
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success('Profile photo updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen flex flex-col gap-6"
    >
      <PageHeader 
        title={`Welcome, ${firstName}`} 
        description="Your personal details, leave summary, and quick actions." 
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Identity & Personal Info Section */}
        <section className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Section */}
            <div
              className="relative w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-white text-3xl font-bold overflow-hidden cursor-pointer group shadow-lg"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : user.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                getInitials(user.displayName)
              )}
              {!uploading && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white" />
                  <span className="text-white text-[10px] font-bold mt-1 uppercase tracking-tighter">Update</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div className="text-center sm:text-left space-y-2">
              <h2 className="text-2xl font-bold text-[var(--color-heading)] tracking-tight">{user.displayName}</h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                  {user.employmentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 border-t border-[var(--color-card-border)] pt-8">
            <ProfileField label="Work Email" value={user.email} icon={<Mail size={14} />} />
            <ProfileField label="Job Title" value={user.jobTitle} icon={<Briefcase size={14} />} />
            <ProfileField label="Phone Number" value={user.phoneNumber} icon={<Phone size={14} />} />
            <ProfileField 
              label="Join Date" 
              value={user.joinDate ? format(new Date(user.joinDate), 'MMMM dd, yyyy') : '—'} 
              icon={<Calendar size={14} />} 
            />
            <ProfileField 
              label="Manager" 
              value={user.manager?.displayName} 
              icon={<UserCheck size={14} />} 
            />
            <ProfileField label="Role Permissions" value={ROLE_LABELS[user.role]} icon={<Shield size={14} />} />
          </div>

          {/* Emergency Contact */}
          <div className="bg-slate-50/50 rounded-2xl p-6 border border-[var(--color-card-border)]">
            <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-500 rounded-full" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <MiniField label="Name" value={user.emergencyName} />
              <MiniField label="Relation" value={user.emergencyRelation} />
              <MiniField label="Phone" value={user.emergencyPhone} />
            </div>
          </div>
        </section>

        {/* Leave Summary & Quick Actions */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BalanceCard 
              label="Standard Leave" 
              value={std.total - (std.consumed + std.inApproval)} 
              subtext={`${std.consumed} used of ${std.total}`} 
            />
            <BalanceCard 
              label="Emergency Leave" 
              value={emg.total - (emg.consumed + emg.inApproval)} 
              subtext={`${emg.consumed} used of ${emg.total}`} 
            />
            <BalanceCard 
              label="Floater Leave" 
              value={flt.total - (flt.consumed + flt.inApproval)} 
              subtext={`${flt.consumed} used of ${flt.total}`} 
            />
            <BalanceCard 
              label="In Approval" 
              value={std.inApproval + emg.inApproval + flt.inApproval} 
              subtext="Awaiting approval"
              highlight 
            />
          </div>

          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-heading)] uppercase tracking-wider mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <ActionButton 
                label="Apply for Leave" 
                onClick={() => router.push(`/${user.role.toLowerCase()}/leave`)}
                primary
              />
              <ActionButton 
                label="View Leave History" 
                onClick={() => router.push(`/${user.role.toLowerCase()}/leave?tab=requests`)}
              />
              <ActionButton 
                label="Go to Dashboard" 
                onClick={() => router.push(`/${user.role.toLowerCase()}/dashboard`)}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* --- Atomic Sub-components --- */

function ProfileField({ label, value, icon }: { label: string, value: string | null | undefined, icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <span className="text-slate-300">{icon}</span>
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--color-heading)] break-all">
        {value || '—'}
      </p>
    </div>
  )
}

function MiniField({ label, value }: { label: string, value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-bold text-[var(--color-heading)]">{value || '—'}</p>
    </div>
  )
}

function BalanceCard({ label, value, subtext, highlight = false }: { label: string, value: number, subtextText?: string, subtext?: string, highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl border transition-all ${highlight ? 'bg-blue-50 border-blue-100 shadow-blue-50' : 'bg-white border-[var(--color-card-border)] shadow-sm'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className="text-3xl font-extrabold text-slate-900 tracking-tighter mb-2">{value}</p>
      <p className="text-[11px] font-medium text-slate-500">{subtext}</p>
    </div>
  )
}

function ActionButton({ label, onClick, primary = false }: { label: string, onClick: () => void, primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 px-6 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${
        primary 
          ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 hover:bg-slate-900 active:scale-[0.98]' 
          : 'bg-white border border-[var(--color-card-border)] text-[var(--color-heading)] hover:bg-slate-50 active:scale-[0.98]'
      }`}
    >
      {label}
      <ChevronRight size={16} className={`transition-transform group-hover:translate-x-1 ${primary ? 'text-slate-200' : 'text-slate-300'}`} />
    </button>
  )
}
