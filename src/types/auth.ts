export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN'

export interface CurrentUser {
  id: string
  entraObjectId: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  jobTitle?: string | null
  department?: string | null
  profilePictureUrl?: string | null
  role: Role
  employmentStatus: string
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
