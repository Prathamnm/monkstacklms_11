'use client'

import { useRef, useState, type DragEvent, type CSSProperties } from 'react'
import { useMsal } from '@azure/msal-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO } from 'date-fns'
import { Upload, Download, Table, CheckCircle, AlertTriangle, X, ChevronLeft, ChevronRight, FileText, Palmtree, Trash2, Pencil, Calendar, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { PoliciesSection } from '@/components/shared/PoliciesSection'
import { HolidayManagerTab } from '@/components/shared/HolidayManagerTab'

interface AttendanceRecord {
  id: string
  date: string
  punchIn: string | null
  punchOut: string | null
  hoursWorked: number | null
  employee?: { displayName: string; email: string; jobTitle?: string | null }
}

interface ParsedRow {
  email: string
  date: string
  punchIn: string
  punchOut: string
}

function statusLabel(hours: number | null) {
  if (hours === null) return { label: 'No Data', color: '#64748B', bg: '#F1F5F9' }
  if (hours >= 6) return { label: 'Full Day', color: '#15803D', bg: '#F0FDF4' }
  if (hours >= 3) return { label: 'Half Day', color: '#B45309', bg: '#FFFBEB' }
  return { label: 'Absent / Short', color: '#B91C1C', bg: '#FEF2F2' }
}

function parseCSVText(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim())
    const row: any = {}
    headers.forEach((h, i) => {
      row[h] = vals[i] || ''
    })
    return {
      email: row['email'] || '',
      date: row['date'] || '',
      punchIn: row['punchin'] || row['punch_in'] || row['punch in'] || '',
      punchOut: row['punchout'] || row['punch_out'] || row['punch out'] || '',
    }
  }).filter((r) => r.email && r.date)
}

function parseExcelFile(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return rows
    .map((row) => {
      const normalized: any = {}
      Object.entries(row).forEach(([key, value]) => {
        normalized[key.toLowerCase().replace(/\s|_/g, '')] = value
      })
      return {
        email: String(normalized['email'] || ''),
        date: String(normalized['date'] || ''),
        punchIn: String(normalized['punchin'] || ''),
        punchOut: String(normalized['punchout'] || ''),
      }
    })
    .filter((r) => r.email && r.date)
}

function downloadCSV(records: AttendanceRecord[]) {
  const header = 'Name,Email,Date,Punch In,Punch Out,Hours Worked,Status'
  const rows = records.map((r) => {
    const s = statusLabel(r.hoursWorked)
    return [
      r.employee?.displayName || '',
      r.employee?.email || '',
      r.date ? format(parseISO(r.date), 'yyyy-MM-dd') : '',
      r.punchIn ? format(parseISO(r.punchIn), 'HH:mm') : '',
      r.punchOut ? format(parseISO(r.punchOut), 'HH:mm') : '',
      r.hoursWorked !== null && r.hoursWorked !== undefined ? r.hoursWorked : '',
      s.label,
    ].join(',')
  })
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function UploadTab() {
  const { instance } = useMsal()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [uploadResult, setUploadResult] = useState<{ processed: number; errors: string[] } | null>(null)

  async function handleFile(file: File) {
    setParseError('')
    setUploadResult(null)
    setParsedRows([])
    setFileName(file.name)

    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      if (ext === 'csv') {
        const text = await file.text()
        const rows = parseCSVText(text)
        if (rows.length === 0) {
          setParseError('No valid rows found. Check the CSV format.')
          return
        }
        setParsedRows(rows)
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer()
        const rows = parseExcelFile(buffer)
        if (rows.length === 0) {
          setParseError('No valid rows found. Check the Excel format.')
          return
        }
        setParsedRows(rows)
      } else if (ext === 'pdf') {
        setParseError('PDF upload detected. PDFs cannot be parsed automatically — please export your attendance data as CSV or Excel from your punch system and upload that instead.')
      } else {
        setParseError('Unsupported file type. Please upload a CSV or Excel (.xlsx) file.')
      }
    } catch {
      setParseError('Failed to parse file. Please check the format and try again.')
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const uploadMutation = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/attendance/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Upload failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      setUploadResult(data)
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success(`${data.processed} records uploaded successfully`)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(message)
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', marginBottom: 8 }}>📋 Required Columns</p>
        <code style={{ fontSize: 12, color: '#1D4ED8', background: '#DBEAFE', padding: '4px 10px', borderRadius: 6 }}>
          email, date (DD-MM-YYYY or YYYY-MM-DD), punchIn (HH:mm), punchOut (HH:mm)
        </code>
        <p style={{ fontSize: 12, color: '#1D4ED8', marginTop: 8 }}>
          Accepts <strong>CSV</strong> or <strong>Excel (.xlsx)</strong>. Column headers are case-insensitive.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--color-card-border)',
          borderRadius: 16,
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'var(--color-page-bg)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        <Upload size={32} style={{ color: '#1D4ED8', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-heading)' }}>
          {fileName || 'Drop file here or click to browse'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
          Supports CSV, Excel (.xlsx / .xls)
        </p>
      </div>

      {parseError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#B91C1C' }}>{parseError}</p>
        </div>
      )}

      {parsedRows.length > 0 && (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} color="#15803D" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-heading)' }}>
                {parsedRows.length} rows parsed from <em>{fileName}</em>
              </span>
            </div>
            <button
              onClick={() => {
                setParsedRows([])
                setFileName('')
                setUploadResult(null)
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-page-bg)' }}>
                  {['Email', 'Date', 'Punch In', 'Punch Out'].map((heading) => (
                    <th key={heading} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, index) => (
                  <tr key={index} style={{ borderTop: '1px solid var(--color-card-border)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--color-heading)' }}>{row.email}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-heading)' }}>{row.date}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-heading)' }}>{row.punchIn || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-heading)' }}>{row.punchOut || '—'}</td>
                  </tr>
                ))}
                {parsedRows.length > 5 && (
                  <tr style={{ borderTop: '1px solid var(--color-card-border)' }}>
                    <td colSpan={4} style={{ padding: '10px 16px', color: 'var(--color-muted)', fontSize: 12, fontStyle: 'italic' }}>
                      + {parsedRows.length - 5} more rows not shown in preview
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-card-border)' }}>
            <button
              onClick={() => uploadMutation.mutate(parsedRows)}
              disabled={uploadMutation.isPending}
              style={{
                background: '#1D4ED8',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: uploadMutation.isPending ? 0.7 : 1,
              }}
            >
              <Upload size={16} />
              {uploadMutation.isPending ? 'Uploading...' : `Upload ${parsedRows.length} Records`}
            </button>
          </div>
        </div>
      )}

      {uploadResult && (
        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} color="#15803D" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#15803D' }}>{uploadResult.processed} records saved to database</span>
          </div>
          {uploadResult.errors.length > 0 && (
            <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#B91C1C', marginBottom: 6 }}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
                {uploadResult.errors.length} rows had errors:
              </p>
              {uploadResult.errors.map((error, index) => (
                <p key={index} style={{ fontSize: 12, color: '#B91C1C', marginBottom: 2 }}>
                  • {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RecordsTab() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ punchIn: '', punchOut: '' })
  const PAGE_SIZE = 15

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'hr', 'all', month],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/attendance?all=true&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, punchIn, punchOut }: { id: string; punchIn: string; punchOut: string }) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ punchIn, punchOut }),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      setEditingId(null)
      toast.success('Record updated')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Record deleted')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const filtered = records.filter((record) => {
    const matchesSearch = !search ||
      record.employee?.displayName.toLowerCase().includes(search.toLowerCase()) ||
      record.employee?.email.toLowerCase().includes(search.toLowerCase())
    
    const matchesDate = !selectedDate || record.date.startsWith(selectedDate)
    
    return matchesSearch && matchesDate
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function prevMonth() {
    const d = new Date(`${month}-01`)
    d.setMonth(d.getMonth() - 1)
    setMonth(format(d, 'yyyy-MM'))
    setPage(1)
  }

  function nextMonth() {
    const d = new Date(`${month}-01`)
    d.setMonth(d.getMonth() + 1)
    setMonth(format(d, 'yyyy-MM'))
    setPage(1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Search & Filter Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'var(--color-card-bg)',
        border: '0.5px solid var(--color-card-border)',
        borderRadius: 14,
        padding: '16px 20px',
        gap: 20,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={prevMonth}
              style={{ background: 'var(--color-page-bg)', border: '1px solid var(--color-card-border)', borderRadius: 8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-muted)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-heading)', minWidth: 120, textAlign: 'center' }}>
              {format(new Date(`${month}-01`), 'MMMM yyyy')}
            </span>
            <button
              onClick={nextMonth}
              style={{ background: 'var(--color-page-bg)', border: '1px solid var(--color-card-border)', borderRadius: 8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-muted)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--color-card-border)' }} />

          {/* Day Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 500 }}>Filter by Day:</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setPage(1)
                }}
                style={{ 
                  border: '1px solid var(--color-card-border)', 
                  borderRadius: 10, 
                  padding: '8px 12px', 
                  fontSize: 13, 
                  background: 'var(--color-page-bg)', 
                  color: 'var(--color-heading)',
                  outline: 'none',
                  minWidth: 140
                }}
              />
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate('')} 
                  style={{ position: 'absolute', right: -50, background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', fontSize: 12, fontWeight: 500 }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{ 
                border: '1px solid var(--color-card-border)', 
                borderRadius: 10, 
                padding: '10px 12px 10px 34px', 
                fontSize: 13, 
                width: 240, 
                background: 'var(--color-page-bg)',
                color: 'var(--color-heading)',
                outline: 'none'
              }}
            />
          </div>
          <button
            onClick={() => downloadCSV(filtered)}
            disabled={filtered.length === 0}
            style={{
              background: '#1D4ED8',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'opacity 0.2s',
              opacity: filtered.length === 0 ? 0.5 : 1
            }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {!isLoading && records.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Logs', value: records.length, color: '#1D4ED8', bg: '#EFF6FF', stroke: '#BFDBFE' },
            { label: 'Active Filter', value: filtered.length, color: '#6366F1', bg: '#EEF2FF', stroke: '#C7D2FE' },
            { label: 'Full Day Count', value: filtered.filter((r) => (r.hoursWorked ?? 0) >= 6).length, color: '#15803D', bg: '#F0FDF4', stroke: '#BBF7D0' },
            { label: 'Half Day Count', value: filtered.filter((r) => (r.hoursWorked ?? 0) >= 3 && (r.hoursWorked ?? 0) < 6).length, color: '#B45309', bg: '#FFFBEB', stroke: '#FEF3C7' },
          ].map((card) => (
            <div 
              key={card.label} 
              style={{ 
                background: card.bg, 
                border: `1px solid ${card.stroke}`,
                borderRadius: 12, 
                padding: '10px 16px', 
                display: 'flex', 
                flexDirection: 'column',
                minWidth: 140
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: card.color, textTransform: 'uppercase', letterSpacing: '0.02em', opacity: 0.8 }}>{card.label}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: card.color, marginTop: 4 }}>{card.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>Loading records...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-heading)' }}>No records found</p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>Upload attendance data or adjust your filters.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--color-page-bg)' }}>
                    {['Employee', 'Date', 'Punch In', 'Punch Out', 'Hours', 'Status', 'Actions'].map((heading) => (
                      <th key={heading} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((record, index) => {
                    const status = statusLabel(record.hoursWorked)
                    const isEditing = editingId === record.id

                    return (
                      <tr key={record.id} style={{ borderTop: '1px solid var(--color-card-border)', background: index % 2 === 0 ? 'transparent' : 'var(--color-page-bg)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--color-heading)' }}>{record.employee?.displayName || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{record.employee?.email || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-heading)', whiteSpace: 'nowrap' }}>
                          {record.date ? format(parseISO(record.date), 'EEE, MMM d yyyy') : '—'}
                        </td>
                        
                        {isEditing ? (
                          <>
                            <td style={{ padding: '12px 16px' }}>
                              <input 
                                type="datetime-local" 
                                value={editForm.punchIn.slice(0, 16)} 
                                onChange={e => setEditForm({ ...editForm, punchIn: e.target.value })}
                                style={{ fontSize: 12, border: '1px solid var(--color-card-border)', borderRadius: 4, padding: '4px' }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <input 
                                type="datetime-local" 
                                value={editForm.punchOut.slice(0, 16)} 
                                onChange={e => setEditForm({ ...editForm, punchOut: e.target.value })}
                                style={{ fontSize: 12, border: '1px solid var(--color-card-border)', borderRadius: 4, padding: '4px' }}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px 16px', color: 'var(--color-heading)' }}>{record.punchIn ? format(parseISO(record.punchIn), 'hh:mm a') : '—'}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--color-heading)' }}>{record.punchOut ? format(parseISO(record.punchOut), 'hh:mm a') : '—'}</td>
                          </>
                        )}

                        <td style={{ padding: '12px 16px', fontWeight: 600, color: status.color }}>{record.hoursWorked !== null && record.hoursWorked !== undefined ? `${record.hoursWorked}h` : '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: status.bg, color: status.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {isEditing ? (
                              <>
                                <button onClick={() => updateMutation.mutate({ id: record.id, ...editForm })} style={{ background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                <button onClick={() => setEditingId(null)} style={{ background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingId(record.id)
                                    setEditForm({ 
                                      punchIn: record.punchIn || record.date, 
                                      punchOut: record.punchOut || record.date 
                                    })
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D4ED8', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }} 
                                  title="Edit"
                                  className="hover:bg-blue-50"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button 
                                  onClick={() => { if (confirm('Delete this record?')) deleteMutation.mutate(record.id) }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }} 
                                  title="Delete"
                                  className="hover:bg-red-50"
                                >
                                  <Trash2 size={15} />
                                </button>
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
            {totalPages > 1 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 7, padding: '5px 12px', fontSize: 13, cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 7, padding: '5px 12px', fontSize: 13, cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function HRAttendancePage() {
  const [tab, setTab] = useState<'attendance' | 'policy' | 'holiday'>('attendance')
  const [attendanceView, setAttendanceView] = useState<'upload' | 'records'>('upload')

  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    background: active ? '#1D4ED8' : 'transparent',
    color: active ? '#fff' : 'var(--color-muted)',
    transition: 'all 0.15s ease',
  })

  const subTabStyle = (active: boolean): CSSProperties => ({
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? 'var(--icon-pill-blue-bg)' : 'transparent',
    color: active ? 'var(--icon-pill-blue-stroke)' : 'var(--color-muted)',
    transition: 'all 0.15s ease',
  })

  return (
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-heading)' }}>Document Uploads</h1>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
          Upload attendance data, policy documents, and manage public holidays.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        <button style={tabStyle(tab === 'attendance')} onClick={() => setTab('attendance')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={15} /> Attendance</span>
        </button>
        <button style={tabStyle(tab === 'policy')} onClick={() => setTab('policy')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={15} /> Policy Docs</span>
        </button>
        <button style={tabStyle(tab === 'holiday')} onClick={() => setTab('holiday')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Palmtree size={15} /> Holidays</span>
        </button>
      </div>

      {tab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ 
            display: 'inline-flex', 
            background: 'var(--color-card-bg)', 
            border: '0.5px solid var(--color-card-border)', 
            borderRadius: 10, 
            padding: 4,
            width: 'fit-content'
          }}>
            <button 
              style={subTabStyle(attendanceView === 'upload')} 
              onClick={() => setAttendanceView('upload')}
            >
              Upload
            </button>
            <button 
              style={subTabStyle(attendanceView === 'records')} 
              onClick={() => setAttendanceView('records')}
            >
              View Records
            </button>
          </div>
          
          <div style={{ 
            animation: 'fadeIn 0.3s ease-out'
          }}>
            {attendanceView === 'upload' ? <UploadTab /> : <RecordsTab />}
          </div>
        </div>
      )}

      {tab === 'policy' && <PoliciesSection canUpload={true} />}

      {tab === 'holiday' && <HolidayManagerTab />}
    </div>
  )
}
