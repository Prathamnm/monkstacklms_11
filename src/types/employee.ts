export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN'
export type AvailabilityStatus = 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM'

export interface Employee {
  id: string
  entraObjectId: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  department?: string | null
  phoneNumber?: string | null
  profilePictureUrl?: string | null
  role: Role
  employmentStatus: EmploymentStatus
  managerId?: string | null
  manager?: Pick<Employee, 'id' | 'displayName' | 'email'> | null
  joinDate: string
  terminationDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface EmployeeWithAvailability extends Employee {
  availabilityStatus: AvailabilityStatus
  currentLeaveEnd?: string | null
  projects?: { id: string; name: string; code: string; color: string }[]
}

export interface LeaveBalanceSummary {
  year: number
  standardTotal: number
  standardAccrued: number
  standardUsed: number
  standardCarryForward: number
  emergencyTotal: number
  emergencyUsed: number
  availableStandard: number
  availableEmergency: number
  pendingDays: number
  effectiveAvailable: number
}
