export const LEAVE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REVOKED: 'REVOKED',
} as const

export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS]

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REVOKED: 'Revoked',
}

export const LEAVE_STATUS_STYLES: Record<LeaveStatus, string> = {
  PENDING: 'bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]',
  APPROVED: 'bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]',
  REJECTED: 'bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]',
  CANCELLED: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-text)]',
  REVOKED: 'bg-[var(--announce-purple-bg)] text-[var(--announce-purple-title)]',
}
