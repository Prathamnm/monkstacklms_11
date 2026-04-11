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
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-slate-700 font-semibold text-lg mb-2">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
