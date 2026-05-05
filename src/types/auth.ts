export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR'

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
  emergencyName?: string | null
  emergencyRelation?: string | null
  emergencyPhone?: string | null
  role: Role
  employmentStatus: string
  joinDate?: string | Date | null
  managerId?: string | null
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
