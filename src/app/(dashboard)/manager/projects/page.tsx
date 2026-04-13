'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { Plus, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import type { Project } from '@/types/project'

export default function ManagerProjectsPage() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [showNewForm, setShowNewForm] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', code: '', description: '', color: '#6366f1' })

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['managerProjects'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load projects')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/manager/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to create project')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Project created')
      queryClient.invalidateQueries({ queryKey: ['managerProjects'] })
      setShowNewForm(false)
      setNewProject({ name: '', code: '', description: '', color: '#6366f1' })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Ongoing Projects"
        description="Create and manage your active projects"
        badge={projects.length}
        actions={
          <button onClick={() => setShowNewForm(!showNewForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Project
          </button>
        }
      />

      {showNewForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-xl border border-slate-200 p-5 mb-6"
        >
          <h3 className="text-slate-900 font-semibold mb-4">Create New Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name *</label>
              <input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="input w-full"
                placeholder="e.g. Project Alpha"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Code *</label>
              <input
                value={newProject.code}
                onChange={(e) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                className="input w-full"
                placeholder="e.g. PROJ-001"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <input
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="input w-full"
                placeholder="Project description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
              <input
                type="color"
                value={newProject.color}
                onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary">
              Create Project
            </button>
            <button onClick={() => setShowNewForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </motion.div>
      )}

      {projects.length === 0 ? (
        <EmptyState icon="📁" title="No projects yet" description="Create your first project to start allocating team members." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/manager/projects/${project.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <h3 className="font-semibold text-slate-900">{project.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${project.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {project.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mb-2">{project.code}</p>
              {project.description && (
                <p className="text-slate-500 text-sm mb-3">{project.description}</p>
              )}
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <Users size={13} />
                <span>{project._count?.members ?? 0} members</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
