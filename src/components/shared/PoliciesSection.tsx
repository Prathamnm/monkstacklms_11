'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

interface Policy {
  id: string
  title: string
  fileName: string
  fileUrl: string
  createdAt: string
}

interface PoliciesSectionProps {
  canUpload?: boolean
}

export function PoliciesSection({ canUpload = false }: PoliciesSectionProps) {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [uploadForm, setUploadForm] = useState({ open: false, title: '' })
  const [fileData, setFileData] = useState<{ name: string; base64: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFileData({
        name: file.name,
        base64: reader.result as string
      })
    }
    reader.readAsDataURL(file)
  }

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/policies', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; fileUrl: string; fileName: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to upload policy')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setUploadForm({ open: false, title: '' })
      setFileData(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/policies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  })

  const openBase64PDF = (base64Data: string) => {
    try {
      if (!base64Data.startsWith('data:application/pdf;base64,')) {
        window.open(base64Data, '_blank')
        return
      }
      const base64WithoutHeader = base64Data.split(',')[1]
      const byteCharacters = atob(base64WithoutHeader)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const fileURL = URL.createObjectURL(blob)
      window.open(fileURL, '_blank')
    } catch (err) {
      window.open(base64Data, '_blank')
    }
  }

  return (
    <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className={HEADING_STYLES.cardHeader}>Company Policies</h3>
        {canUpload && (
          <button
            type="button"
            onClick={() => {
              setUploadForm((f) => ({ ...f, open: !f.open }))
              setError(null)
              setFileData(null)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[11px] font-bold uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            <Upload size={14} /> {uploadForm.open ? 'Close' : 'Upload'}
          </button>
        )}
      </div>

      {canUpload && uploadForm.open && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <input
            placeholder="Policy title..."
            value={uploadForm.title}
            onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
          />
          
          <div className="relative border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-100 transition-colors">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <FileText size={20} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                {fileData ? fileData.name : 'Choose PDF File'}
              </span>
            </div>
          </div>

          {error && <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">{error}</p>}
          
          <button
            type="button"
            onClick={() =>
              addMutation.mutate({
                title: uploadForm.title,
                fileUrl: fileData!.base64,
                fileName: fileData!.name,
              })
            }
            disabled={!uploadForm.title || !fileData || addMutation.isPending}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {addMutation.isPending ? 'Uploading...' : 'Save Policy'}
          </button>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No policies available</p>
          </div>
        ) : (
          policies.map((p) => (
              <div className="group flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm hover:border-blue-100 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-900 leading-tight truncate">{p.title}</p>
                <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">{p.fileName}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => openBase64PDF(p.fileUrl)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-tight transition-colors"
                >
                  <ExternalLink size={14} /> Open
                </button>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
