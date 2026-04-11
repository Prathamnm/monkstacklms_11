export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  UNAUTHORIZED: '/unauthorized',

  EMPLOYEE: {
    DASHBOARD: '/employee/dashboard',
    PROJECTS: '/employee/projects',
    APPLY_LEAVE: '/employee/apply-leave',
    MY_LEAVES: '/employee/my-leaves',
    MY_TEAM: '/employee/my-team',
  },

  MANAGER: {
    DASHBOARD: '/manager/dashboard',
    APPROVALS: '/manager/approvals',
    APPROVAL_DETAIL: (id: string) => `/manager/approvals/${id}`,
    EMPLOYEES: '/manager/employees',
    PROJECTS: '/manager/projects',
    PROJECT_DETAIL: (id: string) => `/manager/projects/${id}`,
  },

  HR: {
    DASHBOARD: '/hr/dashboard',
    EMPLOYEES: '/hr/employees',
    EMPLOYEE_DETAIL: (id: string) => `/hr/employees/${id}`,
    LIFECYCLE: '/hr/lifecycle',
    LIFECYCLE_ONBOARD: '/hr/lifecycle/onboard',
    LEAVES: '/hr/leaves',
    LEAVE_DETAIL: (id: string) => `/hr/leaves/${id}`,
    REPORTS: '/hr/reports',
    RULES: '/hr/rules',
  },

  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    EMPLOYEES: '/admin/employees',
    LEAVES: '/admin/leaves',
    PROJECTS: '/admin/projects',
    AUDIT: '/admin/audit',
    SETTINGS: '/admin/settings',
  },
} as const

export const ROLE_DEFAULT_ROUTES = {
  EMPLOYEE: ROUTES.EMPLOYEE.DASHBOARD,
  MANAGER: ROUTES.MANAGER.DASHBOARD,
  HR: ROUTES.HR.DASHBOARD,
  ADMIN: ROUTES.ADMIN.DASHBOARD,
} as const
