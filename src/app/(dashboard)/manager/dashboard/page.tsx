'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Users, CalendarX, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'

interface ManagerStats {
  pendingApprovals: number
  teamSize: number
  onLeaveToday: number
  leavesThisMonth: number
}

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 800
    const steps = 30
    const stepValue = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += stepValue
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return <span>{count}</span>
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function ManagerDashboardPage() {
  const { instance } = useMsal()
  const router = useRouter()
  const { data: userData } = useCurrentUser()

  const { data: stats, isLoading } = useQuery<ManagerStats>({
    queryKey: ['managerStats'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const [approvalsRes, employeesRes] = await Promise.all([
        fetch('/api/manager/approvals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/manager/employees', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const approvals = await approvalsRes.json()
      const employees = await employeesRes.json()
      const today = new Date()
      const onLeaveToday = (employees as Array<{ availabilityStatus: string }>)
        .filter((e) => e.availabilityStatus !== 'AVAILABLE').length

      return {
        pendingApprovals: Array.isArray(approvals) ? approvals.length : 0,
        teamSize: Array.isArray(employees) ? employees.length : 0,
        onLeaveToday,
        leavesThisMonth: 0,
      }
    },
  })

  if (isLoading) return <PageSkeleton />

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userData?.user.firstName ?? 'there'

  const statCards = [
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals ?? 0,
      icon: <CheckSquare size={20} />,
      color: 'bg-amber-50 text-amber-600',
      href: '/manager/approvals',
    },
    {
      label: 'Team Size',
      value: stats?.teamSize ?? 0,
      icon: <Users size={20} />,
      color: 'bg-blue-50 text-blue-600',
      href: '/manager/employees',
    },
    {
      label: 'On Leave Today',
      value: stats?.onLeaveToday ?? 0,
      icon: <CalendarX size={20} />,
      color: 'bg-red-50 text-red-600',
    },
    {
      label: 'Leaves This Month',
      value: stats?.leavesThisMonth ?? 0,
      icon: <Calendar size={20} />,
      color: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            onClick={() => stat.href && router.push(stat.href)}
            className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 ${stat.href ? 'cursor-pointer' : ''}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-3xl font-bold text-slate-900">
              <AnimatedCounter value={stat.value} />
            </p>
            <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <h2 className="text-slate-900 font-semibold text-base mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/manager/approvals')}
            className="btn-primary flex items-center gap-2"
          >
            <CheckSquare size={16} />
            Review Approvals
            {(stats?.pendingApprovals ?? 0) > 0 && (
              <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stats?.pendingApprovals}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push('/manager/projects')}
            className="btn-secondary flex items-center gap-2"
          >
            View Projects
          </button>
          <button
            onClick={() => router.push('/manager/employees')}
            className="btn-secondary flex items-center gap-2"
          >
            Team Calendar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
