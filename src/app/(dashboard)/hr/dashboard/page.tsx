'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'

interface HRStats {
  totalActive: number
  onLeaveToday: number
  pendingApprovals: number
  newJoinersThisMonth: number
  leavesThisMonth: number
  availablePercent: number
  monthlyTrend: { month: string; count: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (typeof value !== 'number') return
    const timer = setTimeout(() => {
      const steps = 30
      let current = 0
      const step = value / steps
      const interval = setInterval(() => {
        current += step
        if (current >= value) { setCount(value); clearInterval(interval) }
        else setCount(Math.floor(current))
      }, 800 / steps)
      return () => clearInterval(interval)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-3xl font-bold text-slate-900">
        {typeof value === 'number' ? count : value}
        {typeof value === 'string' && value.includes('%') ? '' : ''}
      </p>
      <p className="text-slate-500 text-xs mt-1">{label}</p>
      <div className={`h-1 rounded-full mt-3 ${color}`} />
    </div>
  )
}

export default function HRDashboardPage() {
  const { instance } = useMsal()

  const { data: stats, isLoading } = useQuery<HRStats>({
    queryKey: ['hrStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [empRes, leavesRes] = await Promise.all([
        fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hr/leaves', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const employees = await empRes.json()
      const leaves = await leavesRes.json()

      const activeEmployees = Array.isArray(employees)
        ? employees.filter((e: { employmentStatus: string }) => e.employmentStatus === 'ACTIVE')
        : []

      const onLeaveToday = Array.isArray(employees)
        ? employees.filter((e: { availabilityStatus: string }) => e.availabilityStatus !== 'AVAILABLE').length
        : 0

      const pendingLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'PENDING').length
        : 0

      const approvedLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'APPROVED').length
        : 0

      const rejectedLeaves = Array.isArray(leaves)
        ? leaves.filter((l: { status: string }) => l.status === 'REJECTED').length
        : 0

      return {
        totalActive: activeEmployees.length,
        onLeaveToday,
        pendingApprovals: pendingLeaves,
        newJoinersThisMonth: 0,
        leavesThisMonth: Array.isArray(leaves) ? leaves.length : 0,
        availablePercent: activeEmployees.length > 0
          ? Math.round(((activeEmployees.length - onLeaveToday) / activeEmployees.length) * 100)
          : 100,
        monthlyTrend: [
          { month: 'Nov', count: 8 }, { month: 'Dec', count: 12 },
          { month: 'Jan', count: 6 }, { month: 'Feb', count: 10 },
          { month: 'Mar', count: 14 }, { month: 'Apr', count: approvedLeaves },
        ],
        statusDistribution: [
          { name: 'Approved', value: approvedLeaves, color: '#16A34A' },
          { name: 'Pending', value: pendingLeaves, color: '#D97706' },
          { name: 'Rejected', value: rejectedLeaves, color: '#DC2626' },
        ],
      }
    },
  })

  if (isLoading) return <PageSkeleton />
  if (!stats) return null

  const statItems = [
    { label: 'Total Active Employees', value: stats.totalActive, color: 'bg-blue-500' },
    { label: 'On Leave Today', value: stats.onLeaveToday, color: 'bg-red-500' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, color: 'bg-amber-500' },
    { label: 'Leaves This Month', value: stats.leavesThisMonth, color: 'bg-purple-500' },
    { label: 'New Joiners This Month', value: stats.newJoinersThisMonth, color: 'bg-green-500' },
    { label: 'Available Today', value: `${stats.availablePercent}%`, color: 'bg-teal-500' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="HR Dashboard" description="Organization overview and workforce metrics" />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        {statItems.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly trend - 2/3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5"
        >
          <h3 className="text-slate-900 font-semibold text-sm mb-4">Monthly Leave Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthlyTrend}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status distribution - 1/3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-5"
        >
          <h3 className="text-slate-900 font-semibold text-sm mb-4">Leave Status Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.statusDistribution.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                {stats.statusDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {stats.statusDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
