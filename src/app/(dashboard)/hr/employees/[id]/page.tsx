'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { getInitials } from '@/lib/utils/formatters'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { formatDateRange } from '@/lib/utils/dateUtils'
import type { EmployeeWithAvailability } from '@/types/employee'
import type { LeaveRequest } from '@/types/leave'

interface EmployeeDetail {
  employee: EmployeeWithAvailability
  leaves: LeaveRequest[]
}

export default function HREmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()

  const { data, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ['hrEmployee', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [empRes, leavesRes] = await Promise.all([
        fetch(`/api/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/hr/leaves?employeeId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const employee = await empRes.json()
      const leaves = await leavesRes.json()
      return { employee, leaves: Array.isArray(leaves) ? leaves : [] }
    },
  })

  if (isLoading) return <PageSkeleton />
  if (!data) return null

  const { employee, leaves } = data

  return (
    <div className="p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Employees
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-3">
              {getInitials(employee.displayName)}
            </div>
            <h2 className="text-slate-900 font-bold text-lg">{employee.displayName}</h2>
            <p className="text-slate-500 text-sm">{employee.jobTitle}</p>
            <span className={`mt-2 text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[employee.role]}`}>
              {ROLE_LABELS[employee.role]}
            </span>
          </div>
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {[
              { label: 'Email', value: employee.email },
              { label: 'Department', value: employee.department ?? '—' },
              { label: 'Phone', value: employee.phoneNumber ?? '—' },
              { label: 'Join Date', value: format(parseISO(employee.joinDate), 'MMM d, yyyy') },
              { label: 'Status', value: employee.employmentStatus },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{item.label}</p>
                <p className="text-slate-900 text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Today</p>
            <AvailabilityBadge status={employee.availabilityStatus} />
          </div>
        </div>

        {/* Leave History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-slate-900 font-semibold">Leave History</h3>
            </div>
            {leaves.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No leave requests</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Days</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">{leave.totalDays}</td>
                      <td className="px-5 py-3">
                        <LeaveStatusBadge status={leave.status} />
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {format(parseISO(leave.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
