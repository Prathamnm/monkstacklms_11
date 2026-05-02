export type TeamLeaveType = 'annual' | 'sick' | 'floater' | 'emergency'
export type TeamLeaveStatus = 'approved' | 'pending'

export interface TeamLeaveOverviewRecord {
  employeeId: string
  name: string
  designation: string
  avatarInitials: string
  avatarColor: string
  leaveType: TeamLeaveType
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  status: TeamLeaveStatus
  department?: string | null
}

