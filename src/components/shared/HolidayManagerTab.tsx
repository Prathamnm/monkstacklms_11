'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, AlertTriangle, Upload, Pencil, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface PublicHoliday {
  id: string
  name: string
  date: string
  type: 'PUBLIC' | 'FLOATER'
  notes?: string | null
}

export function HolidayManagerTab() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'upload' | 'records'>('upload')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', date: '', type: 'PUBLIC' as 'PUBLIC' | 'FLOATER', notes: '' })

  const { data: holidays = [], isLoading } = useQuery<PublicHoliday[]>({
    queryKey: ['publicHolidays'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; date: string; type: string; notes: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/holidays/${data.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Holiday updated')
      queryClient.invalidateQueries({ queryKey: ['publicHolidays'] })
      setEditingId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      toast.success('Holiday removed')
      queryClient.invalidateQueries({ queryKey: ['publicHolidays'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-heading)' }}>Public Holidays</h2>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>Manage the annual holiday calendar for all employees.</p>
        </div>
        <div style={{ 
          display: 'inline-flex', 
          background: 'var(--color-card-bg)', 
          border: '0.5px solid var(--color-card-border)', 
          borderRadius: 10, 
          padding: 4 
        }}>
          <button 
            onClick={() => setView('upload')}
            style={{ 
              padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 7, cursor: 'pointer',
              background: view === 'upload' ? 'var(--icon-pill-blue-bg)' : 'transparent',
              color: view === 'upload' ? 'var(--icon-pill-blue-stroke)' : 'var(--color-muted)',
              transition: 'all 0.2s'
            }}
          >
            Bulk Upload
          </button>
          <button 
            onClick={() => setView('records')}
            style={{ 
              padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 7, cursor: 'pointer',
              background: view === 'records' ? 'var(--icon-pill-blue-bg)' : 'transparent',
              color: view === 'records' ? 'var(--icon-pill-blue-stroke)' : 'var(--color-muted)',
              transition: 'all 0.2s'
            }}
          >
            View Directory
          </button>
        </div>
      </div>

      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {view === 'upload' ? <HolidayUploadView /> : <HolidayRecordsView 
          holidays={holidays} 
          isLoading={isLoading} 
          onDelete={(id: string) => deleteMutation.mutate(id)}
          isDeleting={deleteMutation.isPending}
          editingId={editingId}
          setEditingId={setEditingId}
          editForm={editForm}
          setEditForm={setEditForm}
          onUpdate={(data: any) => updateMutation.mutate(data)}
          isUpdating={updateMutation.isPending}
        />}
      </div>
    </div>
  )
}

function HolidayUploadView() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [parsed, setParsed] = useState<any[]>([])
  const [fileName, setFileName] = useState('')

  const uploadMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/holidays/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`${data.processed} holidays imported successfully`)
      queryClient.invalidateQueries({ queryKey: ['publicHolidays'] })
      setParsed([])
      setFileName('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    setFileName(file.name)
    
    if (ext === 'csv') {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((h, i) => { row[h] = vals[i] })
        return { name: row.name, date: row.date, type: row.type, notes: row.notes }
      })
      setParsed(rows.filter(r => r.name && r.date))
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)
      setParsed(rows.map(row => ({
        name: row.name || row.Name,
        date: row.date || row.Date,
        type: row.type || row.Type || 'PUBLIC',
        notes: row.notes || row.Notes
      })).filter(r => r.name && r.date))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', marginBottom: 8 }}>📋 CSV/Excel Structure</p>
        <code style={{ fontSize: 12, color: '#1D4ED8', background: '#DBEAFE', padding: '4px 10px', borderRadius: 6 }}>
          name, date (DD-MM-YYYY), type (PUBLIC/FLOATER), notes
        </code>
      </div>

      <div 
        onClick={() => document.getElementById('holiday-file')?.click()}
        style={{ border: '2px dashed var(--color-card-border)', borderRadius: 16, padding: '48px', textAlign: 'center', cursor: 'pointer', background: 'var(--color-page-bg)' }}
      >
        <input id="holiday-file" type="file" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} accept=".csv,.xlsx,.xls" />
        <Upload size={32} style={{ color: '#1D4ED8', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-heading)' }}>{fileName || 'Click to upload holiday schedule'}</p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>Supports CSV and Excel files</p>
      </div>

      {parsed.length > 0 && (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-heading)' }}>{parsed.length} holidays detected</span>
          <button 
            onClick={() => uploadMutation.mutate(parsed)}
            disabled={uploadMutation.isPending}
            style={{ background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: uploadMutation.isPending ? 0.6 : 1 }}
          >
            {uploadMutation.isPending ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      )}
    </div>
  )
}

function HolidayRecordsView({ holidays, isLoading, onDelete, isDeleting, editingId, setEditingId, editForm, setEditForm, onUpdate, isUpdating }: any) {
  if (isLoading) return <div style={{ color: 'var(--color-muted)', fontSize: 14 }}>Loading holidays...</div>
  
  return (
    <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--color-page-bg)' }}>
            {['Date', 'Holiday Name', 'Type', 'Notes', 'Actions'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holidays.map((h: any, idx: number) => {
            const isEditing = editingId === h.id
            return (
              <tr key={h.id} style={{ borderTop: '1px solid var(--color-card-border)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-page-bg)' }}>
                <td style={{ padding: '12px 16px' }}>
                  {isEditing ? (
                    <input type="date" value={editForm.date.split('T')[0]} onChange={e => setEditForm({ ...editForm, date: e.target.value })} style={{ fontSize: 12, padding: '4px', border: '1px solid var(--color-card-border)', borderRadius: 4 }} />
                  ) : (
                    <span style={{ color: 'var(--color-heading)', whiteSpace: 'nowrap' }}>{format(parseISO(h.date), 'EEE, MMM d yyyy')}</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {isEditing ? (
                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ fontSize: 12, padding: '4px', border: '1px solid var(--color-card-border)', borderRadius: 4, width: '100%' }} />
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{h.name}</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {isEditing ? (
                    <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value as any })} style={{ fontSize: 12, padding: '4px', border: '1px solid var(--color-card-border)', borderRadius: 4 }}>
                      <option value="PUBLIC">Public</option>
                      <option value="FLOATER">Floater</option>
                    </select>
                  ) : (
                    <span style={{
                      background: h.type === 'PUBLIC' ? '#FEE2E2' : '#FEF9C3',
                      color: h.type === 'PUBLIC' ? '#991B1B' : '#854D0E',
                      borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                      {h.type === 'PUBLIC' ? 'Public' : 'Floater'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {isEditing ? (
                    <input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={{ fontSize: 12, padding: '4px', border: '1px solid var(--color-card-border)', borderRadius: 4, width: '100%' }} />
                  ) : (
                    <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>{h.notes || '—'}</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => onUpdate({ id: h.id, ...editForm })} style={{ background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(h.id); setEditForm({ ...h }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D4ED8', padding: '4px', borderRadius: 4 }} title="Edit"><Pencil size={15} /></button>
                        <button onClick={() => { if (confirm('Remove holiday?')) onDelete(h.id) }} disabled={isDeleting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', padding: '4px', borderRadius: 4 }} title="Delete"><Trash2 size={15} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
