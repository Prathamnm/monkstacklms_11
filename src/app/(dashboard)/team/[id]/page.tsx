'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { motion } from 'framer-motion'

interface EmployeeDetail {
  employee: {
    id: string
    displayName: string
    workEmail: string
    jobTitle?: string | null
    phoneNumber?: string | null
    joinDate: string
    entraObjectId: string
    role: 'EMPLOYEE' | 'MANAGER' | 'HR'
    employmentStatus: string
    availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'HALF_DAY'
    emergencyName?: string | null
    emergencyRelation?: string | null
    emergencyPhone?: string | null
    notificationEmail?: string | null
    manager?: { id: string; displayName: string } | null
  }
}

export default function TeamEmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()

  const { data, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ['teamEmployee', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch employee')
      const employee = await res.json()
      return { employee }
    },
  })

  if (isLoading) return <PageSkeleton />
  if (!data) return null

  const { employee } = data

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button onClick={() => router.push('/employee/my-team')} className="flex items-center gap-2" style={{ color: 'var(--color-muted)', fontSize: 14, marginBottom: 16, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-heading)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-muted)'}>
        <ArrowLeft size={16} /> Back to Team Monkstack
      </button>

      {/* Header Profile Section */}
      <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--icon-pill-blue-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--icon-pill-blue-stroke)',
            fontSize: 20,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {getInitials(employee.displayName)}
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-heading)', margin: 0 }}>{employee.displayName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>{employee.jobTitle ?? 'Employee'}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[employee.role]}`}>
              {ROLE_LABELS[employee.role]}
            </span>
            <AvailabilityBadge status={employee.availabilityStatus} />
          </div>
        </div>
      </div>

      {/* Read-only Details */}
      <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '24px 28px' }}>
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)', marginBottom: 20 }}>Personal Identity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Full Name</p>
            <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.displayName}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Work Email</p>
            <a href={`mailto:${employee.workEmail}`} style={{ color: 'var(--icon-pill-blue-stroke)', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>{employee.workEmail}</a>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Job Title</p>
            <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.jobTitle || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Phone Number</p>
            <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.phoneNumber || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Join Date</p>
            <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{format(parseISO(employee.joinDate), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Role</p>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[employee.role]}`}>{ROLE_LABELS[employee.role]}</span>
          </div>
        </div>

        {/* Emergency Contact */}
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--color-card-border)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)', marginBottom: 16 }}>Emergency Contact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, background: 'var(--color-page-bg)', borderRadius: 12, padding: 16, border: '1px solid var(--color-card-border)' }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Name</p>
              <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.emergencyName || '—'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Relation</p>
              <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.emergencyRelation || '—'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Phone</p>
              <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.emergencyPhone || '—'}</p>
            </div>
          </div>
        </div>

        {/* Work Details */}
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--color-card-border)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)', marginBottom: 16 }}>Work Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Reporting Manager</p>
              <p style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: 14 }}>{employee.manager?.displayName || 'Unassigned'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Employment Status</p>
              <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 99, background: employee.employmentStatus === 'ACTIVE' ? 'var(--status-approved-bg)' : 'var(--color-page-bg)', color: employee.employmentStatus === 'ACTIVE' ? 'var(--status-approved-text)' : 'var(--color-muted)' }}>{employee.employmentStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
