export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED'
export type HalfDayType = 'NONE' | 'FIRST_HALF' | 'SECOND_HALF'

export interface LeaveRequest {
  id: string
  employeeId: string
  employee?: {
    id: string
    displayName: string
    email: string
    jobTitle?: string | null
    department?: string | null
    profilePictureUrl?: string | null
  }
  startDate: string
  endDate: string
  startHalfDay: HalfDayType
  endHalfDay: HalfDayType
  totalDays: number
  reason: string
  status: LeaveStatus
  approverId?: string | null
  approver?: {
    id: string
    displayName: string
    email: string
  } | null
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  revokedAt?: string | null
  revokedBy?: string | null
  revocationReason?: string | null
  cancelledAt?: string | null
  emailsSent?: Record<string, boolean> | null
  createdAt: string
  updatedAt: string
}

export interface ApplyLeavePayload {
  startDate: string
  endDate: string
  startHalfDay: HalfDayType
  endHalfDay: HalfDayType
  reason: string
}

export interface AccrualRule {
  id: string
  name: string
  standardLeavesPerYear: number
  emergencyLeavesPerYear: number
  accrualMethod: string
  daysPerMonth: number
  carryForwardEnabled: boolean
  carryForwardMaxDays: number
  isActive: boolean
  effectiveFrom: string
  createdAt: string
  updatedAt: string
}
