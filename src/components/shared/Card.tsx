'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface CardProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
  headerAction?: ReactNode
  noPadding?: boolean
}

export function Card({ 
  children, 
  title, 
  description, 
  className, 
  headerAction,
  noPadding = false 
}: CardProps) {
  return (
    <div className={cn(
      "bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl overflow-hidden shadow-sm transition-all duration-200",
      className
    )}>
      {(title || headerAction) && (
        <div className="px-6 py-4.5 border-b border-[var(--color-card-border)] flex items-center justify-between bg-slate-50/20">
          <div>
            {title && <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest leading-none">{title}</h3>}
            {description && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 leading-none">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn(noPadding ? "" : "p-6")}>
        {children}
      </div>
    </div>
  )
}
