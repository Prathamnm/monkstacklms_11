'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Loader2, FileSpreadsheet, FileText, File } from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import toast from 'react-hot-toast'
import { getAccessToken } from '@/lib/auth/getAccessToken'

interface ExportEmployeesModalProps {
  isOpen: boolean
  onClose: () => void
  totalCount: number
}

type ExportFormat = 'xlsx' | 'csv' | 'pdf'

const FORMAT_OPTIONS: { format: ExportFormat; label: string; description: string; icon: React.ReactNode; ext: string }[] = [
  {
    format: 'xlsx',
    label: 'Excel',
    description: 'Best for filtering, sorting, and editing data',
    icon: <FileSpreadsheet size={24} className="text-green-600" />,
    ext: '.xlsx',
  },
  {
    format: 'csv',
    label: 'CSV',
    description: 'Universal format compatible with all spreadsheet apps',
    icon: <FileText size={24} className="text-blue-600" />,
    ext: '.csv',
  },
  {
    format: 'pdf',
    label: 'PDF',
    description: 'Opens a printable view — use browser Print → Save as PDF',
    icon: <File size={24} className="text-red-500" />,
    ext: '.pdf',
  },
]

export function ExportEmployeesModal({ isOpen, onClose, totalCount }: ExportEmployeesModalProps) {
  const { instance } = useMsal()
  const [selected, setSelected] = useState<ExportFormat>('xlsx')
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const token = await getAccessToken(instance)
      const res = await fetch(`/api/hr/employees/export?format=${selected}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed. Please try again.')

      if (selected === 'pdf') {
        // Open HTML in new tab for browser print-to-PDF
        const html = await res.text()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        toast.success('PDF view opened — use Print → Save as PDF')
      } else {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const filename = `employees_${new Date().toISOString().split('T')[0]}`
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = `${filename}.${selected}`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(downloadLink)
        toast.success(`Downloaded ${filename}.${selected}`)
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Export failed')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Download size={20} className="text-blue-600" /> Download Employee Data
                </h3>
                <p className="text-slate-500 text-sm mt-0.5">{totalCount} employees · all active & inactive</p>
              </div>
              <button onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Format selector */}
            <div className="p-6 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Select Format</p>
              {FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.format}
                  onClick={() => setSelected(opt.format)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    selected === opt.format
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-shrink-0">{opt.icon}</div>
                  <div>
                    <p className={`font-semibold text-sm ${selected === opt.format ? 'text-blue-700' : 'text-slate-900'}`}>
                      {opt.label} <span className="font-normal text-slate-400 font-mono text-xs">{opt.ext}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selected === opt.format ? 'border-slate-800 bg-slate-800' : 'border-slate-300'
                    }`}>
                      {selected === opt.format && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between">
              <button onClick={onClose} className="btn-secondary" disabled={isDownloading}>Cancel</button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
              >
                {isDownloading
                  ? <><Loader2 className="animate-spin" size={16} /> Preparing...</>
                  : <><Download size={16} /> Download {selected.toUpperCase()}</>
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
