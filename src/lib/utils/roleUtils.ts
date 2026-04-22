import { ROUTES } from '@/constants/routes'
import { Role } from '@prisma/client'

export function canApproveLeave(role: Role): boolean {
  return role === 'MANAGER'
}

export function canRevokeLeave(role: Role): boolean {
  return role === 'HR'
}

export function getDashboardPath(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return ROUTES.HR.DASHBOARD
    case 'HR':
      return ROUTES.HR.DASHBOARD
    case 'MANAGER':
      return ROUTES.MANAGER.DASHBOARD
    case 'EMPLOYEE':
    default:
      return ROUTES.EMPLOYEE.DASHBOARD
  }
}

// Support the old name as well if needed, but the layout uses getDashboardPath
export const getDashboardRoute = getDashboardPath

export function canAccessProjectRoute(role: Role, pathname: string): boolean {
  // Projects feature has been removed, so we allow access to paths 
  // that were previously project-locked, or just return true 
  // if they are on their allowed role prefix.
  return true 
}

export function canAccessAdminRoute(role: Role): boolean {
  return false
}

export function canAccessHRRoute(role: Role): boolean {
  return role === 'HR'
}

export function canAccessManagerRoute(role: Role): boolean {
  return role === 'MANAGER'
}
