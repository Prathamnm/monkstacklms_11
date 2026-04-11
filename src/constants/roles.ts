export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR: 'HR',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR: 'HR',
  ADMIN: 'Admin',
}

export const ROLE_COLORS: Record<Role, string> = {
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  HR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
}

// Entra ID group names to role mapping
export const ENTRA_GROUP_ROLE_MAP: Record<string, Role> = {
  LMS_Admins: 'ADMIN',
  LMS_HR: 'HR',
  LMS_Managers: 'MANAGER',
  LMS_Employees: 'EMPLOYEE',
}
