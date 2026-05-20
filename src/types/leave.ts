import type { LeaveStatus, HalfDayType } from '@/constants'
import { Guid } from './guid'
export type { LeaveStatus, HalfDayType }

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
  halfDayDates?: string[] | null
  dayOverrides?: { date: string, type: 'full' | 'half' }[] | null
  emailsSent?: Record<string, boolean> | null
  createdAt: string
  updatedAt: string
}

export interface DayOverride {
  date: string
  type: 'full' | 'half'
}

export interface ApplyLeavePayload {
  title: string
  startDate: string
  endDate: string
  startHalfDay: HalfDayType
  endHalfDay: HalfDayType
  halfDayDates?: string[]
  dayOverrides?: { date: string, type: 'full' | 'half' }[]
  totalDays: number
  reason: string
  isEmergency?: boolean
  managerId?: Guid | null
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
  effectiveFrom: Date
  createdAt: Date
  updatedAt: Date
}
