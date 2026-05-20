'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface TeamPerformanceChartProps {
  data: { month: string; count: number }[]
}

export function TeamPerformanceChart({ data }: TeamPerformanceChartProps) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">Team Leave Trends</h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Approved leaves per month</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Approved</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            />
            <Bar 
              dataKey="count" 
              radius={[4, 4, 0, 0]}
              barSize={32}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === data.length - 1 ? '#2563eb' : '#cbd5e1'} 
                  className="hover:fill-blue-500 transition-colors cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
