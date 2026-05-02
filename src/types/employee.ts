export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN'
export type AvailabilityStatus = 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM'

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
  managerId?: string | null
  manager?: Pick<Employee, 'id' | 'displayName' | 'workEmail'> | null
  joinDate: string
  terminationDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface EmployeeWithAvailability extends Employee {
  availabilityStatus: AvailabilityStatus
  currentLeaveEnd?: string | null
  managerName?: string | null
}

export interface LeaveBalanceSummary {
  year: number
  standardTotal: number
  standardAccrued: number
  standardUsed: number
  standardCarryForward: number
  floaterTotal: number
  floaterUsed: number
  emergencyTotal: number
  emergencyUsed: number
  availableStandard: number
  availableFloater: number
  availableEmergency: number
  pendingDays: number
  effectiveAvailable: number
}
