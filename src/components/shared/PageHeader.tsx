import { cn } from '@/lib/utils/cn'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: string | number
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-8', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-heading)] tracking-tight">
            {title}
          </h1>
          {badge !== undefined && (
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-[var(--color-muted)] font-medium">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
