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
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[1.75rem] font-bold text-slate-900">{title}</h1>
          {badge !== undefined && (
            <span className="bg-slate-100 text-slate-700 text-sm font-semibold px-2.5 py-1 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-slate-500 text-base mt-1.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
