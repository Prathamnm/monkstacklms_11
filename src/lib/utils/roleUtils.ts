import { ROUTES } from '@/constants/routes'
import type { Role } from '@/types/auth'

export function canApproveLeave(role: Role): boolean {
  return role === 'MANAGER' || role === 'ADMIN'
}

export function canRevokeLeave(role: Role): boolean {
  return role === 'HR' || role === 'ADMIN'
}

export function canManageEmployees(role: Role): boolean {
  return role === 'HR' || role === 'ADMIN'
}

export function canManageProjects(role: Role): boolean {
  return role === 'MANAGER' || role === 'ADMIN'
}

export function canViewAuditLog(role: Role): boolean {
  return role === 'ADMIN'
}

export function canExportReports(role: Role): boolean {
  return role === 'HR' || role === 'ADMIN'
}

export function canConfigureRules(role: Role): boolean {
  return role === 'HR' || role === 'ADMIN'
}

export function canManageSystemSettings(role: Role): boolean {
  return role === 'ADMIN'
}

export function getDashboardPath(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return ROUTES.ADMIN.DASHBOARD
    case 'HR':
      return ROUTES.HR.DASHBOARD
    case 'MANAGER':
      return ROUTES.MANAGER.DASHBOARD
    case 'EMPLOYEE':
    default:
      return ROUTES.EMPLOYEE.DASHBOARD
  }
}
