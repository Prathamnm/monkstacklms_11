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
  // kept for backward compat with other portals that pass these
  color?: string
  icon?: React.ReactNode
}

export function StatCard({ label, value, description, href, className }: StatCardProps) {
  const content = (
    <div className={cn(
      "bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col",
      href && "hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer",
      className
    )}>
      {/* Label — small, uppercase, muted */}
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 leading-none">
        {label}
      </p>

      {/* Value — large, bold, dark */}
      <p className="text-[28px] font-bold text-slate-900 leading-none">
        {value}
      </p>

      {/* Description — pushed to bottom */}
      {description && (
        <p className="text-[11px] text-slate-400 mt-auto pt-3 leading-none">
          {description}
        </p>
      )}
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
