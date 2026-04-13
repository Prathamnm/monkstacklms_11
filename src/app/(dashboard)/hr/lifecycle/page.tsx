'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserPlus, UserMinus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export default function HRLifecyclePage() {
  const router = useRouter()

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Employee Lifecycle" description="Onboard new employees or offboard departing ones" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => router.push('/hr/lifecycle/onboard')}
          className="bg-white border-2 border-green-200 hover:border-green-400 rounded-xl p-8 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
            <UserPlus size={28} />
          </div>
          <h3 className="text-slate-900 font-bold text-lg mb-2">Onboard Employee</h3>
          <p className="text-slate-500 text-sm">Add a new employee to Monkstack HRM. Set up their profile, role, and initial leave balance.</p>
          <span className="inline-block mt-4 text-green-600 text-sm font-medium">Start Onboarding →</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push('/hr/lifecycle/offboard')}
          className="bg-white border-2 border-red-200 hover:border-red-400 rounded-xl p-8 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
            <UserMinus size={28} />
          </div>
          <h3 className="text-slate-900 font-bold text-lg mb-2">Offboard Employee</h3>
          <p className="text-slate-500 text-sm">Process the departure of an employee. Terminate their account and handle pending leave requests.</p>
          <span className="inline-block mt-4 text-red-600 text-sm font-medium">Start Offboarding →</span>
        </motion.div>
      </div>
    </div>
  )
}
