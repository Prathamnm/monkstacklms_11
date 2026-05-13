'use client'

import { useRef, useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { Upload, CheckCircle, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { motion } from 'framer-motion'
import { Card } from '@/components/shared/DesignSystem'
import type { ParsedAttendanceRow as ParsedRow } from '@/types/attendance'

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

export function AttendanceUploadTab() {
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
      } else {
        setParseError('Unsupported file type. Please upload a CSV or Excel (.xlsx) file.')
      }
    } catch {
      setParseError('Failed to parse file. Please check the format and try again.')
    }
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
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    },
  })

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <Upload size={20} />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-blue-900 uppercase tracking-wider mb-1">Required Format</h4>
          <p className="text-[12px] text-blue-700 font-medium mb-2">
            The file must contain headers: <code className="bg-blue-200/50 px-1.5 py-0.5 rounded text-blue-800">email, date, punchIn, punchOut</code>
          </p>
          <p className="text-[11px] text-blue-600 italic">Accepts CSV or Excel (.xlsx). Date formats: DD-MM-YYYY or YYYY-MM-DD.</p>
        </div>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="group relative border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors mx-auto mb-4">
          <Upload size={32} />
        </div>
        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">
          {fileName || 'Drop file here or click to browse'}
        </p>
        <p className="text-[11px] text-slate-400 mt-2 font-medium uppercase tracking-tight">
          CSV, Excel (.xlsx / .xls)
        </p>
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-[12px] text-red-700 font-semibold">{parseError}</p>
        </div>
      )}

      {parsedRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <CheckCircle size={16} />
              </div>
              <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                {parsedRows.length} Rows Parsed Preview
              </span>
            </div>
            <button
              onClick={() => { setParsedRows([]); setFileName(''); setUploadResult(null); }}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Punch In</th>
                  <th className="px-6 py-3 text-left">Punch Out</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 font-medium">
                {parsedRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3">{row.email}</td>
                    <td className="px-6 py-3">{row.date}</td>
                    <td className="px-6 py-3">{row.punchIn || '—'}</td>
                    <td className="px-6 py-3">{row.punchOut || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => uploadMutation.mutate(parsedRows)}
              disabled={uploadMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
            >
              {uploadMutation.isPending ? 'Processing...' : `Submit ${parsedRows.length} Records`}
            </button>
          </div>
        </Card>
      )}

      {uploadResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle size={20} />
            <h4 className="text-sm font-bold uppercase tracking-tight">{uploadResult.processed} Records Processed Successfully</h4>
          </div>
          {uploadResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} />
                {uploadResult.errors.length} Errors Found
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                {uploadResult.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-700 font-medium">• {err}</p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
