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
    <div className={cn('flex items-start justify-between mb-[18px]', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-heading)' }}>{title}</h1>
          {badge !== undefined && (
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: 'var(--balance-track-bg)',
                color: 'var(--color-heading)',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6 }}>{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
