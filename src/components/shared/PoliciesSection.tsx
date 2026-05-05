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

    if (file.size > 10 * 1024 * 1024) { // 10MB
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
      console.error('Failed to open PDF:', err)
      window.open(base64Data, '_blank')
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 16,
        padding: '24px 28px',
        width: '100%',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-heading)' }}>Company Policies</h3>
        {canUpload && (
          <button
            type="button"
            onClick={() => {
              setUploadForm((f) => ({ ...f, open: !f.open }))
              setError(null)
              setFileData(null)
            }}
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
            <Upload size={14} /> {uploadForm.open ? 'Close' : 'Upload Policy'}
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
            gap: 12,
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
              background: 'var(--color-card-bg)',
              color: 'var(--color-heading)',
            }}
          />
          
          <div style={{
            border: '1px dashed var(--color-card-border)',
            borderRadius: 8,
            padding: '16px',
            textAlign: 'center',
            background: 'var(--color-card-bg)',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <FileText size={20} style={{ color: 'var(--icon-pill-blue-stroke)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-heading)' }}>
                {fileData ? fileData.name : 'Click or drag PDF to upload'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>Max size: 10MB</span>
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: '#B91C1C' }}>{error}</p>}
          
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
            style={{
              background: '#1D4ED8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: (!uploadForm.title || !fileData || addMutation.isPending) ? 0.6 : 1
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
              <button
                type="button"
                onClick={() => openBase64PDF(p.fileUrl)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--icon-pill-blue-stroke)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
                className="hover:bg-blue-50"
              >
                <ExternalLink size={14} /> Open
              </button>
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
