'use client'

import { PageHeader } from '@/components/shared/PageHeader'
import { MyLeavesView } from '@/components/leave/MyLeavesView'
import { motion } from 'framer-motion'

export default function HRMyLeavesPage() {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="p-6 lg:p-8 space-y-6">
      <PageHeader title="My Leaves" description="View and manage your leave requests." />
      <MyLeavesView role="HR" />
    </motion.div>
  )
}
