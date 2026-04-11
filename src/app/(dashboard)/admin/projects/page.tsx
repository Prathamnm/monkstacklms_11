'use client'

import { useRouter } from 'next/navigation'

export default function AdminProjectsPage() {
  const router = useRouter()

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Project Management</h1>
      <p className="text-slate-500 text-sm mb-6">Full CRUD access to all projects</p>
      <button onClick={() => router.push('/manager/projects')} className="btn-primary">
        Open Project Manager
      </button>
    </div>
  )
}
