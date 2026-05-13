'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES, CONTAINER_STYLES } from '@/constants/tailwind'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div>
        <h2 className={HEADING_STYLES.sectionTitle}>{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

interface FormSectionProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function FormSection({ children, title, className }: FormSectionProps) {
  return (
    <div className={cn(CONTAINER_STYLES.card, "p-5", className)}>
      {title && <h3 className={HEADING_STYLES.subsectionTitle + " mb-4"}>{title}</h3>}
      {children}
    </div>
  )
}

interface FormFieldProps {
  label: string
  children: React.ReactNode
  error?: string
  required?: boolean
  className?: string
}

export function FormField({ label, children, error, required, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-semibold text-slate-700 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("border-b border-slate-100 my-5", className)} />
}
