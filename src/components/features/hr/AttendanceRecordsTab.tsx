'use client'

import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { format, parseISO } from 'date-fns'
import { 
  Download, 
  CheckCircle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Pencil, 
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge } from '@/components/shared/DesignSystem'
import { cn } from '@/lib/utils/cn'
import type { AttendanceRecord } from '@/types/attendance'

function statusLabel(hours: number | null) {
  if (hours === null) return { label: 'No Data', variant: 'slate' as const }
  if (hours >= 6) return { label: 'Full Day', variant: 'emerald' as const }
  if (hours >= 3) return { label: 'Half Day', variant: 'amber' as const }
  return { label: 'Short / Absent', variant: 'red' as const }
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

export function AttendanceRecordsTab() {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() - 1); setMonth(format(d, 'yyyy-MM')); setPage(1); }}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 min-w-[120px] text-center">
              {format(new Date(`${month}-01`), 'MMMM yyyy')}
            </span>
            <button
              onClick={() => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); setMonth(format(d, 'yyyy-MM')); setPage(1); }}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 px-3 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none"
            />
            {selectedDate && (
              <button onClick={() => setSelectedDate('')} className="text-red-500 hover:text-red-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-500 transition-colors" />
            <input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-slate-500/5 focus:border-slate-500 outline-none w-64 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => downloadCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all shadow-lg shadow-slate-200"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: records.length, variant: 'slate' as const },
          { label: 'Filtered', value: filtered.length, variant: 'slate' as const },
          { label: 'Full Days', value: filtered.filter((r) => (r.hoursWorked ?? 0) >= 6).length, variant: 'emerald' as const },
          { label: 'Half Days', value: filtered.filter((r) => (r.hoursWorked ?? 0) >= 3 && (r.hoursWorked ?? 0) < 6).length, variant: 'amber' as const },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 bg-slate-50/50 border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-500 rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Search size={32} />
            </div>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">No matching records</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-6 py-4 text-left whitespace-nowrap">Employee</th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">Punch In</th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">Punch Out</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Hours</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 font-medium">
                  {paginated.map((record, index) => {
                    const status = statusLabel(record.hoursWorked)
                    const isEditing = editingId === record.id

                    return (
                      <tr key={record.id} className={cn("border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors", index % 2 === 1 && "bg-slate-50/20")}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{record.employee?.displayName || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{record.employee?.email || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-600">
                          {record.date ? format(parseISO(record.date), 'EEE, MMM d, yyyy') : '—'}
                        </td>
                        
                        {isEditing ? (
                          <>
                            <td className="px-6 py-4">
                              <input 
                                type="datetime-local" 
                                value={editForm.punchIn.slice(0, 16)} 
                                onChange={e => setEditForm({ ...editForm, punchIn: e.target.value })}
                                className="px-2 py-1 rounded border border-slate-200 outline-none focus:ring-2 focus:ring-slate-500/10"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="datetime-local" 
                                value={editForm.punchOut.slice(0, 16)} 
                                onChange={e => setEditForm({ ...editForm, punchOut: e.target.value })}
                                className="px-2 py-1 rounded border border-slate-200 outline-none focus:ring-2 focus:ring-slate-500/10"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">{record.punchIn ? format(parseISO(record.punchIn), 'hh:mm a') : '—'}</td>
                            <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">{record.punchOut ? format(parseISO(record.punchOut), 'hh:mm a') : '—'}</td>
                          </>
                        )}

                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-slate-900">{record.hoursWorked !== null ? `${record.hoursWorked}h` : '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={status.variant} className="text-[9px] uppercase tracking-tighter">
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={() => updateMutation.mutate({ id: record.id, ...editForm })}
                                  className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button 
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => { setEditingId(record.id); setEditForm({ punchIn: record.punchIn || record.date, punchOut: record.punchOut || record.date }); }}
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button 
                                  onClick={() => { if (confirm('Delete this record?')) deleteMutation.mutate(record.id) }}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} />
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
              <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
