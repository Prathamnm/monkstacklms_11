import { getInitials } from '@/lib/utils/formatters'
import { AvailabilityBadge } from './AvailabilityBadge'
import type { EmployeeWithAvailability } from '@/types/employee'

interface EmployeeCardProps {
  employee: EmployeeWithAvailability
  onClick?: () => void
  showActions?: boolean
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  return (
    <div
      onClick={onClick}
      className="card-hover"
      style={{
        background: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 16,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--status-active-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 15,
          color: 'var(--status-active-text)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {employee.profilePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={employee.profilePictureUrl}
            alt={employee.displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          getInitials(employee.displayName)
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--color-heading)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {employee.displayName}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-muted)',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {employee.workEmail || '—'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 1 }}>
          {employee.jobTitle || 'No title'}
        </p>
      </div>
      <AvailabilityBadge status={employee.availabilityStatus} />
    </div>
  )
}
