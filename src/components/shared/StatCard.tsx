'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface StatCardProps {
  label: string
  value: number | string
  description?: string
  href?: string
  className?: string
  color?: string // Used for the accent line
  icon?: React.ReactNode
}

export function StatCard({ label, value, description, href, className, color = 'blue', icon }: StatCardProps) {
  const accentColors: Record<string, string> = {
    blue: 'bg-blue-600',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-600',
  }

  const content = (
    <div className={cn(
      "bg-white border border-slate-200/60 rounded-2xl p-5 h-full flex flex-col relative overflow-hidden group transition-all duration-200",
      href && "hover:border-slate-300 hover:shadow-md cursor-pointer",
      className
    )}>
      {/* Top Section with Icon & Label */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          {label}
        </p>
        {icon && <div className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">{icon}</div>}
      </div>

      {/* Value */}
      <p className="text-3xl font-black text-slate-900 leading-none tracking-tight">
        {value}
      </p>

      {/* Description */}
      {description && (
        <p className="text-[10px] font-bold text-slate-400 mt-2 leading-none">
          {description}
        </p>
      )}

      {/* Bottom Accent Line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1.5 transition-all duration-200",
        color.startsWith('bg-') ? color : (accentColors[color] || 'bg-slate-200')
      )} />
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block no-underline h-full">
        {content}
      </Link>
    )
  }

  return content
}
