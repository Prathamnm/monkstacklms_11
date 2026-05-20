import { LeaveType } from '@/constants/leaveTypes'
import { LeaveStatus } from '@/constants/leaveStatus'

export interface TeamLeaveOverviewRecord {
  employeeId: string
  name: string
  designation: string
  avatarInitials: string
  avatarColor: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  status: LeaveStatus
  department?: string | null
}

