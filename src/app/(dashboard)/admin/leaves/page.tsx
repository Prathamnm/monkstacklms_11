'use client'

import { useRouter } from 'next/navigation'

export default function AdminLeavesPage() {
  const router = useRouter()

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">All Leaves + Override</h1>
      <p className="text-slate-500 text-sm mb-6">Admin override capabilities on all leave requests</p>
      <button onClick={() => router.push('/hr/leaves')} className="btn-primary">
        Open Leaves Management
      </button>
    </div>
  )
}
