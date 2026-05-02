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
    description: 'All employees with contact info, manager, projects, join date',
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
    <div style={{ padding: '24px 32px', background: 'var(--color-page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader title="Reports" description="Export HR reports for analysis and compliance" />

      {/* Date range filter */}
      <div style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '18px 22px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>From Date</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            style={{ background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-heading)', marginBottom: 6 }}>To Date</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            style={{ background: 'var(--color-page-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--color-heading)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => (
          <div key={report.id} style={{ background: 'var(--color-card-bg)', border: '0.5px solid var(--color-card-border)', borderRadius: 12, padding: '18px 22px' }}>
            <h3 style={{ fontWeight: 500, color: 'var(--color-heading)', marginBottom: 4 }}>{report.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16 }}>{report.description}</p>
            <div style={{ display: 'flex', gap: 8 }}>
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
