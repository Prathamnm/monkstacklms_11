import { Role, EmploymentStatus } from '@/constants'
import { Guid } from './guid'

export interface CurrentUser {
  id: string
  entraObjectId: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  phoneNumber?: string | null
  profilePictureUrl?: string | null
  manager?: { id: string; displayName: string; workEmail?: string } | null
  emergencyName?: string | null
  emergencyRelation?: string | null
  emergencyPhone?: string | null
  role: Role
  employmentStatus: EmploymentStatus
  joinDate?: Date | null
  timeZone?: string
  managerId?: Guid | null
}

export interface AuthSyncPayload {
  entraObjectId: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  jobTitle?: string
}

export interface TokenPayload {
  userId: string
  role: Role
  email: string
  entraObjectId: string
}
