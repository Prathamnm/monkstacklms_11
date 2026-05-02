'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react'

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
  const [uploadForm, setUploadForm] = useState({ open: false, title: '', fileUrl: '', fileName: '' })

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
      if (!res.ok) throw new Error('Failed to upload policy')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setUploadForm({ open: false, title: '', fileUrl: '', fileName: '' })
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

  return (
    <div
      style={{
        background: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 16,
        padding: '24px 28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)' }}>Company Policies</h3>
        {canUpload && (
          <button
            type="button"
            onClick={() => setUploadForm((f) => ({ ...f, open: !f.open }))}
            style={{
              background: 'var(--icon-pill-blue-bg)',
              color: 'var(--icon-pill-blue-stroke)',
              border: '1px solid #BFDBFE',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Upload size={14} /> Upload Policy
          </button>
        )}
      </div>

      {canUpload && uploadForm.open && (
        <div
          style={{
            background: 'var(--color-page-bg)',
            border: '1px solid var(--color-card-border)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            placeholder="Policy title (e.g. Leave Policy 2025)"
            value={uploadForm.title}
            onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
            style={{
              border: '1px solid var(--color-card-border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <input
            placeholder="PDF file URL (paste direct link)"
            value={uploadForm.fileUrl}
            onChange={(e) =>
              setUploadForm((f) => ({
                ...f,
                fileUrl: e.target.value,
                fileName: e.target.value.split('/').pop() || 'policy.pdf',
              }))
            }
            style={{
              border: '1px solid var(--color-card-border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            Upload your PDF to Azure Blob / SharePoint and paste the public URL above.
          </p>
          <button
            type="button"
            onClick={() =>
              addMutation.mutate({
                title: uploadForm.title,
                fileUrl: uploadForm.fileUrl,
                fileName: uploadForm.fileName,
              })
            }
            disabled={!uploadForm.title || !uploadForm.fileUrl || addMutation.isPending}
            style={{
              background: 'var(--icon-pill-blue-stroke)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {addMutation.isPending ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      )}

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading policies...</p>
      ) : policies.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', padding: '20px 0' }}>
          No policies uploaded yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {policies.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--color-page-bg)',
                border: '1px solid var(--color-card-border)',
                borderRadius: 10,
                padding: '12px 16px',
              }}
            >
              <FileText size={18} style={{ color: 'var(--icon-pill-blue-stroke)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>{p.title}</p>
                <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>{p.fileName}</p>
              </div>
              <a
                href={p.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--icon-pill-blue-stroke)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} /> Open
              </a>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--icon-pill-red-stroke)',
                    padding: 4,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
