export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED'
export type HalfDayType = 'NONE' | 'HALF_DAY'

export interface LeaveRequest {
  id: string
  title: string
  employeeId: string
  employee?: {
    id: string
    displayName: string
    email: string
    jobTitle?: string | null

    profilePictureUrl?: string | null
    role?: string
  }
  startDate: string
  endDate: string
  startHalfDay: HalfDayType
  endHalfDay: HalfDayType
  totalDays: number
  reason: string
  isEmergency?: boolean
  status: LeaveStatus
  approverId?: string | null
  approver?: {
    id: string
    displayName: string
    email: string
    role?: string
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
  title: string
  startDate: string
  endDate: string
  startHalfDay: HalfDayType
  endHalfDay: HalfDayType
  reason: string
  isEmergency?: boolean
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
