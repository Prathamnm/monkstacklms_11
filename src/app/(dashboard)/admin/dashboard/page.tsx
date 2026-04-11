'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Users, ScrollText, Play } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export default function AdminDashboardPage() {
  const router = useRouter()

  const quickActions = [
    { label: 'Manage Users', icon: <Users size={20} />, href: '/admin/users', color: 'bg-blue-50 text-blue-600' },
    { label: 'View Audit Log', icon: <ScrollText size={20} />, href: '/admin/audit', color: 'bg-purple-50 text-purple-600' },
    { label: 'System Settings', icon: <Settings size={20} />, href: '/admin/settings', color: 'bg-slate-50 text-slate-600' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Admin Dashboard" description="Full system access and configuration" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        {quickActions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => router.push(action.href)}
            className="bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.color}`}>
              {action.icon}
            </div>
            <h3 className="text-slate-900 font-semibold">{action.label}</h3>
          </motion.div>
        ))}
      </motion.div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-slate-900 font-semibold mb-3">System Health</h3>
        <div className="space-y-2">
          {[
            { label: 'Database Connection', status: 'Connected', color: 'text-green-600 bg-green-50' },
            { label: 'Email Service', status: 'Active', color: 'text-green-600 bg-green-50' },
            { label: 'Last Accrual Run', status: 'Check logs', color: 'text-amber-600 bg-amber-50' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 text-sm">{item.label}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
