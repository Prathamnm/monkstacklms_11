import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon = '📭', title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center', className)}
      style={{ padding: '40px 20px', color: 'var(--color-muted)', fontSize: 13 }}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 style={{ color: 'var(--color-muted)', fontWeight: 500, fontSize: 13, marginBottom: 6 }}>
        {title}
      </h3>
      {description && (
        <p className="max-w-sm leading-relaxed mb-5" style={{ fontSize: 12 }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
