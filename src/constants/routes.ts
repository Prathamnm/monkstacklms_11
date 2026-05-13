export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  UNAUTHORIZED: '/unauthorized',
  PROFILE: '/profile',

  EMPLOYEE: {
    DASHBOARD:   '/employee/dashboard',
    TEAM:        '/employee/my-team',
    CALENDAR:    '/employee/calendar',
    APPLY_LEAVE: '/employee/apply-leave',
    MY_LEAVES:   '/employee/my-leaves',
  },

  MANAGER: {
    DASHBOARD:   '/manager/dashboard',
    TEAM:        '/manager/employees',
    CALENDAR:    '/manager/calendar',
    APPROVALS:   '/manager/approvals',
    APPROVAL_DETAIL: (id: string) => `/manager/approvals/${id}`,
    APPLY_LEAVE: '/manager/apply-leave',
    MY_LEAVES:   '/manager/my-leaves',
  },

  HR: {
    DASHBOARD:   '/hr/dashboard',
    EMPLOYEES:   '/hr/employees',
    EMPLOYEE_DETAIL: (id: string) => `/hr/employees/${id}`,
    CALENDAR:    '/hr/calendar',
    LEAVES:      '/hr/leaves',
    LEAVE_DETAIL: (id: string) => `/hr/leaves/${id}`,
    APPLY_LEAVE: '/hr/apply-leave',
    MY_LEAVES:   '/hr/my-leaves',
    REPORTS:     '/hr/reports',
    AUDIT:       '/hr/audit',
  },
} as const

export const ROLE_DEFAULT_ROUTES = {
  EMPLOYEE: ROUTES.EMPLOYEE.DASHBOARD,
  MANAGER:  ROUTES.MANAGER.DASHBOARD,
  HR:       ROUTES.HR.DASHBOARD,
} as const
