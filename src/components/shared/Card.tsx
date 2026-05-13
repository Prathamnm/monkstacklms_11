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
      "bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl overflow-hidden",
      className
    )}>
      {(title || headerAction) && (
        <div className="px-6 py-5 border-b border-[var(--color-card-border)] flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-950">{title}</h3>}
            {description && <p className="text-xs text-[var(--color-muted)] mt-1">{description}</p>}
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
