'use client'

import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import { PageHeader } from '@/components/shared/PageHeader'

const REPORT_TYPES = [
  {
    id: 'leave-summary',
    title: 'Leave Summary Report',
    description: 'All leaves in date range — employee, dates, days, status, reason',
  },
  {
    id: 'leave-balance',
    title: 'Leave Balance Report',
    description: 'All employees — standard balance, emergency balance, used, pending, available',
  },
  {
    id: 'employee-directory',
    title: 'Employee Directory',
    description: 'All employees with contact info, manager, department, projects, join date',
  },
  {
    id: 'attendance-overview',
    title: 'Attendance Overview',
    description: 'Who was on leave each day — useful for payroll',
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
    <div className="p-6 lg:p-8">
      <PageHeader title="Reports" description="Export HR reports for analysis and compliance" />

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => (
          <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-slate-900 font-semibold mb-1">{report.title}</h3>
            <p className="text-slate-500 text-sm mb-4">{report.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(report.id, 'csv')}
                disabled={!!loading}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                {loading === `${report.id}-csv` ? (
                  <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText size={13} />
                )}
                CSV
              </button>
              <button
                onClick={() => handleExport(report.id, 'xlsx')}
                disabled={!!loading}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                {loading === `${report.id}-xlsx` ? (
                  <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet size={13} />
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
