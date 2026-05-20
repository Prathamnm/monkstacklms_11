import { Role, EmploymentStatus, AvailabilityStatus } from '@/constants'
import { Guid } from './guid'

export interface Employee {
  id: string
  entraObjectId: string
  workEmail: string
  notificationEmail?: string | null
  displayName: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  phoneNumber?: string | null
  emergencyName?: string | null
  emergencyRelation?: string | null
  emergencyPhone?: string | null
  profilePictureUrl?: string | null
  role: Role
  employmentStatus: EmploymentStatus
  managerId?: Guid | null
  manager?: Pick<Employee, 'id' | 'displayName' | 'workEmail'> | null
  joinDate: Date
  terminationDate?: Date | null
  timeZone: string
  createdAt: Date
  updatedAt: Date
}

export interface EmployeeWithAvailability extends Employee {
  availabilityStatus: AvailabilityStatus
  currentLeaveEnd?: Date | null
  managerName?: string | null
}

import { LeaveType } from '@/constants'

export interface LeaveTypeBalance {
  type: LeaveType
  total: number
  consumed: number
  inApproval: number // Leaves currently in 'PENDING' status
}

export interface LeaveBalanceSummary {
  year: number
  balances: LeaveTypeBalance[]
}
