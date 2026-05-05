'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO, isAfter, startOfDay } from 'date-fns'
import { Calendar, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LeaveRequest {
  id: string
  startDate: string
  endDate: string
  status: string
  type: string
  reason: string
}

export function UpcomingLeavesCard() {
  const { instance } = useMsal()
  const router = useRouter()

  const { data: leaves = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['upcomingLeaves'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/leave/requests?status=APPROVED', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      const payload = await res.json()
      const allApproved = payload.data as LeaveRequest[]
      
      const today = startOfDay(new Date())
      return allApproved
        .filter(l => isAfter(parseISO(l.startDate), today) || format(parseISO(l.startDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
        .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())
        .slice(0, 3)
    },
  })

  return (
    <div
      style={{
        background: 'var(--color-card-bg)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: '12px',
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>Upcoming Leaves</p>
        <Calendar size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Loading...</p>
        </div>
      ) : leaves.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>No upcoming approved leaves</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaves.map((leave) => (
            <div 
              key={leave.id}
              style={{ 
                background: 'var(--color-background-secondary)', 
                borderRadius: '8px', 
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {format(parseISO(leave.startDate), 'dd MMM')} - {format(parseISO(leave.endDate), 'dd MMM')}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {(leave.type || 'Leave').replace('_', ' ')} · {(leave.reason || 'No reason').length > 25 ? leave.reason.substring(0, 25) + '...' : (leave.reason || 'No reason')}
                </p>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
          ))}
          <button 
            onClick={() => router.push('/employee/leave')}
            style={{ 
              marginTop: 4,
              fontSize: 11, 
              color: 'var(--color-text-info)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 500
            }}
          >
            View all requests →
          </button>
        </div>
      )}
    </div>
  )
}
