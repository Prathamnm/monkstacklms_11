export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR: 'HR',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR: 'HR',
}

export const ROLE_COLORS: Record<Role, string> = {
  EMPLOYEE: 'bg-slate-600 text-white',
  MANAGER:  'bg-indigo-600 text-white',
  HR:       'bg-fuchsia-600 text-white',
}

// Entra ID group names to role mapping
export const ENTRA_GROUP_ROLE_MAP: Record<string, Role> = {
  LMS_Admins: 'HR', // Retaining LMS_Admins mapping but treating them as HR
  LMS_HR: 'HR',
  LMS_Managers: 'MANAGER',
  LMS_Employees: 'EMPLOYEE',
}
