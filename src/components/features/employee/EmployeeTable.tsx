'use client'

import { getInitials } from '@/lib/utils/formatters'
import type { ApiEmployee } from '@/hooks/useEmployeeDirectory'
import { Card } from '@/components/shared/Card'

interface EmployeeTableProps {
  employees: ApiEmployee[]
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <Card noPadding className="mt-6 overflow-hidden border-slate-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Name</th>
              <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Email</th>
              <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Job Title</th>
              <th className="text-right py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {employees.map((emp) => (
              <tr 
                key={emp.id} 
                className="group hover:bg-slate-50/50 transition-all cursor-default"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-[13px] font-bold shrink-0 transition-transform group-hover:scale-105">
                      {getInitials(emp.displayName)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[13px] leading-tight group-hover:text-blue-700 transition-colors">{emp.displayName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">ID: {emp.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <a 
                    href={`mailto:${emp.email}`} 
                    className="text-[13px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {emp.email}
                  </a>
                </td>
                <td className="py-4 px-6 text-[13px] font-bold text-slate-600">
                  {emp.jobTitle || '—'}
                </td>
                <td className="py-4 px-6 text-right">
                  {emp.availabilityStatus === 'AVAILABLE' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight bg-red-50 text-red-700 border border-red-100">
                      On Leave
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
