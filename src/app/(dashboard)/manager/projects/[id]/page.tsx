'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { ArrowLeft, UserPlus, Trash2, UserMinus, Power } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { AvailabilityBadge } from '@/components/employee/AvailabilityBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils/formatters'
import type { ProjectWithAvailability } from '@/types/project'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useMsal()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [memberSearch, setMemberSearch] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)

  const { data: project, isLoading } = useQuery<ProjectWithAvailability>({
    queryKey: ['project', id],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load project')
      return res.json()
    },
  })

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployeesForProject'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/projects/${id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to add member')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Member added')
      setSelectedEmployeeId('')
      setMemberSearch('')
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['managerProjects'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/projects/${id}/members/${membershipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to remove member')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Member removed')
      setRemoveMemberId(null)
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/projects/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !project?.isActive }),
      })
      if (!res.ok) throw new Error('Failed to update project')
      return res.json()
    },
    onSuccess: () => {
      toast.success(project?.isActive ? 'Project deactivated' : 'Project reactivated')
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['managerProjects'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/manager/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete project')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Project deleted')
      router.replace('/manager/projects')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageSkeleton />
  if (!project) return null

  const currentMemberIds = new Set(project.members?.map((m) => m.employeeId) ?? [])
  const availableToAdd = allEmployees.filter(
    (e: { id: string; displayName: string; designation?: string | null }) =>
      !currentMemberIds.has(e.id) &&
      (memberSearch === '' ||
        e.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (e.designation ?? '').toLowerCase().includes(memberSearch.toLowerCase()))
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 lg:p-8 space-y-6"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              project.isActive
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            <Power size={14} />
            {project.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
          >
            <Trash2 size={14} /> Delete Project
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{project.code}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
              project.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {project.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {project.description && <p className="text-slate-500">{project.description}</p>}
        <p className="text-sm text-slate-500 mt-2">
          {project.availableMembersCount}/{project.totalMembersCount} members available today
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={16} className="text-blue-600" />
          <h2 className="text-slate-900 font-semibold text-base">Add Member</h2>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                setSelectedEmployeeId('')
              }}
              placeholder="Search employee by name or designation..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {memberSearch && availableToAdd.length > 0 && !selectedEmployeeId && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                {availableToAdd.slice(0, 8).map(
                  (e: { id: string; displayName: string; designation?: string | null; jobTitle?: string | null }) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId(e.id)
                        setMemberSearch(e.displayName)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {getInitials(e.displayName)}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{e.displayName}</p>
                        <p className="text-xs text-slate-500">{e.designation ?? e.jobTitle ?? ''}</p>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => selectedEmployeeId && addMemberMutation.mutate(selectedEmployeeId)}
            disabled={!selectedEmployeeId || addMemberMutation.isPending}
            className="rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {addMemberMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-slate-900 font-semibold text-base mb-4">
          Team Members ({project.members?.length ?? 0})
        </h2>
        {!project.members?.length ? (
          <p className="text-sm text-slate-500">No members yet. Add someone above.</p>
        ) : (
          <div className="space-y-2">
            {project.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {member.employee?.profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.employee.profilePictureUrl}
                      alt={member.employee.displayName}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(member.employee?.displayName ?? 'U')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-medium">{member.employee?.displayName}</p>
                  <p className="text-slate-500 text-xs">{member.employee?.jobTitle}</p>
                </div>
                {member.employee && <AvailabilityBadge status={member.employee.availabilityStatus} />}
                {member.employee?.email && (
                  <a
                    href={`mailto:${member.employee.email}`}
                    className="text-xs text-blue-600 hover:underline ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Email
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setRemoveMemberId(member.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all ml-1"
                  title="Remove member"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        onConfirm={() => removeMemberId && removeMemberMutation.mutate(removeMemberId)}
        title="Remove Member"
        description="Remove this member from the project? They can be re-added later."
        confirmLabel="Remove"
        variant="danger"
        isLoading={removeMemberMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Project"
        description="Are you sure you want to permanently delete this project? This cannot be undone. All member assignments will also be removed."
        confirmLabel="Delete Project"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
  )
}
