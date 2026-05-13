'use client'

import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { FileText, FileSpreadsheet, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'

const REPORT_TYPES = [
  {
    id: 'leave-summary',
    title: 'Leave Summary Report',
    description: 'Detailed log of all leave requests within the selected date range including status and reasons.',
  },
  {
    id: 'leave-balance',
    title: 'Leave Balance Report',
    description: 'Comprehensive overview of current leave balances, usage, and pending days for all employees.',
  },
  {
    id: 'employee-directory',
    title: 'Employee Directory',
    description: 'Full workforce snapshot with contact info, manager hierarchy, and employment metadata.',
  },
]

export default function HRReportsPage() {
  const { instance } = useMsal()
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState<string | null>(null)

  async function handleExport(reportType: string, format: 'csv' | 'xlsx') {
    setLoading(`${reportType}-${format}`)
    try {
      const token = await getAccessToken(instance)
      const params = new URLSearchParams({ type: reportType, format, from: dateFrom, to: dateTo })
      const res = await fetch(`/api/hr/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-${dateFrom}-${dateTo}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch {
      toast.error('Failed to export report')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen space-y-6">
      <PageHeader 
        title="Administrative Reports" 
        description="Generate and export comprehensive workforce data for analysis and compliance" 
      />

      {/* Date range filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap gap-6 items-end shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
            <Calendar size={12} className="text-blue-500" />
            From Date
          </label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all shadow-inner"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
            <Calendar size={12} className="text-blue-500" />
            To Date
          </label>
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORT_TYPES.map((report) => (
          <div 
            key={report.id} 
            className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-blue-200 transition-all group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 mb-4 shadow-inner group-hover:bg-blue-50 transition-colors">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-700 transition-colors">
                {report.title}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                {report.description}
              </p>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleExport(report.id, 'csv')}
                disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
              >
                {loading === `${report.id}-csv` ? (
                  <span className="w-3 h-3 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <FileText size={14} className="text-slate-400" />
                )}
                CSV
              </button>
              <button
                onClick={() => handleExport(report.id, 'xlsx')}
                disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
              >
                {loading === `${report.id}-xlsx` ? (
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet size={14} className="text-white/80" />
                )}
                Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
