'use client'

import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, isValid, parse, parseISO } from 'date-fns'
import { Trash2, Upload, Pencil, FileText, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils/cn'
import { isRecord } from '@/lib/utils/typeGuards'

interface PublicHoliday {
  id: string
  name: string
  date: string
  type: 'PUBLIC' | 'FLOATER'
  notes?: string | null
}

type HolidayType = PublicHoliday['type']

interface HolidayUploadRow {
  name: string
  date: string
  type: HolidayType
  notes?: string
}

function normalizeHolidayType(value: unknown): HolidayType {
  return String(value).trim().toUpperCase() === 'FLOATER' ? 'FLOATER' : 'PUBLIC'
}

function normalizeFieldKey(key: string): string {
  return key
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function readField(row: Record<string, unknown>, candidates: string[]): unknown {
  const normalizedCandidates = new Set(candidates.map(normalizeFieldKey))
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeFieldKey(key)
    const matchesCandidate = [...normalizedCandidates].some(
      (candidate) => normalizedKey === candidate || normalizedKey.includes(candidate) || candidate.includes(normalizedKey)
    )
    if (!matchesCandidate) continue
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    return value
  }
  return undefined
}

function buildHolidayRow(row: Record<string, unknown>): HolidayUploadRow | null {
  const name = String(readField(row, ['name', 'holidayname', 'holiday', 'holidaytitle']) ?? '').trim()
  const date = normalizeHolidayDate(readField(row, ['date', 'holidaydate', 'holiday']))
  const typeRaw = readField(row, ['type', 'holidaytype'])
  const notes = String(readField(row, ['notes', 'remark', 'description']) ?? '').trim()
  if (!name || !date) return null
  return { name, date, type: normalizeHolidayType(typeRaw), notes }
}

function rowLooksLikeHolidayHeader(row: unknown[]): boolean {
  const normalizedCells = row
    .map((cell) => normalizeFieldKey(String(cell ?? '')))
    .filter(Boolean)

  if (normalizedCells.length < 3) return false

  const requiredKeys = ['name', 'date', 'type']
  return requiredKeys.every((requiredKey) =>
    normalizedCells.some((cell) => cell === requiredKey || cell.includes(requiredKey) || requiredKey.includes(cell))
  )
}

function tableRowsToHolidayRows(table: unknown[][]): HolidayUploadRow[] {
  if (table.length < 2) return []
  const headerIndex = table.findIndex(rowLooksLikeHolidayHeader)
  if (headerIndex === -1 || headerIndex >= table.length - 1) return []

  const headers = table[headerIndex].map((header) => String(header ?? '').trim())
  const dataRows = table.slice(headerIndex + 1)

  return dataRows
    .filter((values) => values.some((value) => String(value ?? '').trim() !== ''))
    .map((values) => {
      const row: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        if (!header) return
        row[header] = values[index]
      })
      return buildHolidayRow(row)
    })
    .filter((row): row is HolidayUploadRow => Boolean(row))
}

function formatExcelSerialDate(serial: number): string | null {
  const parsed = XLSX.SSF.parse_date_code(serial)
  if (!parsed) return null
  const date = new Date(parsed.y, parsed.m - 1, parsed.d)
  return isValid(date) ? format(date, 'yyyy-MM-dd') : null
}

function normalizeHolidayDate(value: unknown): string {
  if (value instanceof Date) {
    return isValid(value) ? format(value, 'yyyy-MM-dd') : ''
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatExcelSerialDate(value) ?? ''
  }

  const raw = String(value ?? '').trim()
  if (!raw) return ''

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    const formatted = Number.isFinite(serial) ? formatExcelSerialDate(serial) : null
    if (formatted) return formatted
  }

  const candidates = [
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'yyyy/MM/dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'MMM d, yyyy',
    'd MMM yyyy',
    'dd MMM yyyy',
  ]

  for (const dateFormat of candidates) {
    const parsed = parse(raw, dateFormat, new Date())
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
  }

  const fallback = parseISO(raw)
  return isValid(fallback) ? format(fallback, 'yyyy-MM-dd') : ''
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Public Holidays</h2>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">Manage the annual holiday calendar for all employees.</p>
        </div>
        
        <div className="inline-flex bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button 
            onClick={() => setView('upload')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
              view === 'upload' 
                ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Bulk Upload
          </button>
          <button 
            onClick={() => setView('records')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
              view === 'records' 
                ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            View Directory
          </button>
        </div>
      </div>

      <motion.div 
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {view === 'upload' ? <HolidayUploadView /> : <HolidayRecordsView 
          holidays={holidays} 
          isLoading={isLoading} 
          onDelete={(id: string) => deleteMutation.mutate(id)}
          isDeleting={deleteMutation.isPending}
          editingId={editingId}
          setEditingId={setEditingId}
          editForm={editForm}
          setEditForm={setEditForm}
          onUpdate={(data: { id: string; name: string; date: string; type: HolidayType; notes: string }) => updateMutation.mutate(data)}
          isUpdating={updateMutation.isPending}
        />}
      </motion.div>
    </div>
  )
}

function HolidayUploadView() {
  const { instance } = useMsal()
  const queryClient = useQueryClient()
  const [parsed, setParsed] = useState<HolidayUploadRow[]>([])
  const [fileName, setFileName] = useState('')

  const uploadMutation = useMutation({
    mutationFn: async (data: HolidayUploadRow[]) => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/holidays/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(result.error || result.details?.[0] || 'Upload failed')
      }
      return result as { processed: number; errors?: string[] }
    },
    onSuccess: (data) => {
      if (data.processed === 0) {
        toast.error('No holidays were imported. Please check the file format and column names.')
        return
      }
      if (data.errors?.length) {
        toast.success(`${data.processed} holidays imported with ${data.errors.length} skipped rows`)
      } else {
        toast.success(`${data.processed} holidays imported successfully`)
      }
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
      const lines = text.trim().split(/\r?\n/)
      const headers = lines[0].split(',').map((header) => header.trim())
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim())
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
        return buildHolidayRow(row)
      })
      const nextParsed = rows.filter((row): row is HolidayUploadRow => Boolean(row))
      setParsed(nextParsed)
      if (nextParsed.length === 0) {
        toast.error('No valid holiday rows found. Check the CSV headers and date values.')
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const parsedRows = wb.SheetNames.flatMap((sheetName) => {
        const ws = wb.Sheets[sheetName]
        if (!ws) return []
        const table = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][]
        return tableRowsToHolidayRows(table)
      })
      setParsed(parsedRows)
      if (parsedRows.length === 0) {
        toast.error('No valid holiday rows found. Check the Excel headers and date values.')
      }
    } else {
      setParsed([])
      toast.error('Unsupported file type. Please upload a CSV, XLSX, or XLS file.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-inner">
        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <FileText size={14} />
          CSV/Excel Structure
        </p>
        <div className="bg-white/80 border border-blue-100 rounded-xl p-3">
          <code className="text-xs font-bold text-blue-700 tracking-tighter">
            name, date (DD-MM-YYYY), type (PUBLIC/FLOATER), notes
          </code>
        </div>
      </div>

      <div 
        onClick={() => document.getElementById('holiday-file')?.click()}
        className="border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group active:scale-[0.99]"
      >
        <input id="holiday-file" type="file" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} accept=".csv,.xlsx,.xls" />
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner">
          <Upload size={28} />
        </div>
        <p className="text-lg font-bold text-slate-900 leading-tight">
          {fileName || 'Click to upload holiday schedule'}
        </p>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
          Supports CSV and Excel files
        </p>
      </div>

      {parsed.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">{parsed.length} holidays detected</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ready for import</p>
            </div>
          </div>
          <button 
            onClick={() => uploadMutation.mutate(parsed)}
            disabled={uploadMutation.isPending}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Importing...' : 'Start Import'}
          </button>
        </motion.div>
      )}
    </div>
  )
}

function HolidayRecordsView(props: {
  holidays: PublicHoliday[]
  isLoading: boolean
  onDelete: (id: string) => void
  isDeleting: boolean
  editingId: string | null
  setEditingId: (id: string | null) => void
  editForm: { name: string; date: string; type: HolidayType; notes: string }
  setEditForm: Dispatch<SetStateAction<{ name: string; date: string; type: HolidayType; notes: string }>>
  onUpdate: (data: { id: string; name: string; date: string; type: HolidayType; notes: string }) => void
  isUpdating: boolean
}) {
  const { holidays, isLoading, onDelete, isDeleting, editingId, setEditingId, editForm, setEditForm, onUpdate, isUpdating } = props
  if (isLoading) return <div className="text-slate-400 font-bold uppercase tracking-widest text-xs p-12 text-center">Loading holidays...</div>
  
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {['Date', 'Holiday Name', 'Type', 'Notes', 'Actions'].map(h => (
                <th key={h} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holidays.map((h) => {
              const isEditing = editingId === h.id
              return (
                <tr key={h.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editForm.date.split('T')[0]} 
                        onChange={e => setEditForm({ ...editForm, date: e.target.value })} 
                        className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    ) : (
                      <span className="text-[13px] font-bold text-slate-900">
                        {format(parseISO(h.date), 'EEE, MMM d yyyy')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        value={editForm.name} 
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                        className="w-full text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    ) : (
                      <span className="text-[13px] font-bold text-slate-700">{h.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select 
                        value={editForm.type} 
                        onChange={(e) => setEditForm({ ...editForm, type: normalizeHolidayType(e.target.value) })} 
                        className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="FLOATER">Floater</option>
                      </select>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight border",
                        h.type === 'PUBLIC' 
                          ? "bg-red-50 text-red-700 border-red-100" 
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {h.type}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        value={editForm.notes} 
                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })} 
                        className="w-full text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight truncate block max-w-[200px]">
                        {h.notes || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => onUpdate({ id: h.id, ...editForm })} 
                            disabled={isUpdating}
                            className={cn(
                              "bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50",
                              isUpdating && "cursor-not-allowed"
                            )}
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingId(h.id)
                              setEditForm({
                                name: h.name,
                                date: h.date,
                                type: h.type,
                                notes: h.notes ?? '',
                              })
                            }} 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => { if (confirm('Remove holiday?')) onDelete(h.id) }} 
                            disabled={isDeleting} 
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  )
}
