import type { EmployeeWithAvailability } from './employee'

export interface Project {
  id: string
  name: string
  code: string
  description?: string | null
  color: string
  isActive: boolean
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
  _count?: { members: number }
}

export interface ProjectMember {
  id: string
  employeeId: string
  projectId: string
  assignedAt: string
  removedAt?: string | null
  isActive: boolean
  employee?: EmployeeWithAvailability
}

export interface ProjectWithAvailability extends Project {
  members: (ProjectMember & { employee: EmployeeWithAvailability })[]
  availableMembersCount: number
  totalMembersCount: number
}
