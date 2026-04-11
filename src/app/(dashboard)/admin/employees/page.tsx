'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'

export default function AdminEmployeesPage() {
  const router = useRouter()

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
        <p className="text-slate-500 text-sm mt-1">Full employee management with all HR capabilities</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3 mb-6"
      >
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-blue-800 text-sm">
          Admin has full access to all HR employee management features.
          Use the HR Employee Directory for comprehensive employee management.
        </p>
      </motion.div>

      <div className="flex gap-3">
        <button onClick={() => router.push('/hr/employees')} className="btn-primary">
          Go to Employee Directory
        </button>
        <button onClick={() => router.push('/hr/lifecycle')} className="btn-secondary">
          Employee Lifecycle
        </button>
      </div>
    </div>
  )
}
