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
  EMPLOYEE: 'bg-slate-500 text-white',
  MANAGER:  'bg-blue-600 text-white',
  HR:       'bg-purple-600 text-white',
  ADMIN:    'bg-red-600 text-white',
}

// Entra ID group names to role mapping
export const ENTRA_GROUP_ROLE_MAP: Record<string, Role> = {
  LMS_Admins: 'ADMIN',
  LMS_HR: 'HR',
  LMS_Managers: 'MANAGER',
  LMS_Employees: 'EMPLOYEE',
}
