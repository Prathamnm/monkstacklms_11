'use client'

import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO, isAfter, startOfDay } from 'date-fns'
import { Calendar, ChevronRight, Clock } from 'lucide-react'
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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
          Upcoming Leaves
        </p>
        <Calendar size={14} className="text-slate-300" />
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-100 border-t-blue-400 rounded-full animate-spin" />
        </div>
      ) : leaves.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <Clock size={18} className="text-slate-200" />
          <p className="text-[10px] font-medium text-slate-300 uppercase tracking-widest">
            No upcoming approved leaves
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          <div className="flex flex-col gap-1.5">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3 cursor-pointer hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all group"
                onClick={() => router.push('/employee/leave')}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">
                    {format(parseISO(leave.startDate), 'dd MMM')} – {format(parseISO(leave.endDate), 'dd MMM')}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Leave · {leave.reason || 'No reason specified'}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
              </div>
            ))}
          </div>

          {/* Footer link */}
          <button
            onClick={() => router.push('/employee/leave')}
            className="mt-auto pt-3 text-[11px] font-medium text-blue-500 hover:text-blue-600 text-left transition-colors"
          >
            View all requests →
          </button>
        </div>
      )}
    </div>
  )
}
