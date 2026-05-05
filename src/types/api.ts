export interface ApiError {
  error: string
  code: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  recipientId: string
  senderId?: string | null
  sender?: {
    id: string
    displayName: string
    profilePictureUrl?: string | null
  } | null
  referenceId?: string | null
  isRead: boolean
  readAt?: string | null
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  performedBy: string
  performer?: {
    id: string
    displayName: string
    email: string
  }
  targetId?: string | null
  target?: {
    id: string
    displayName: string
    email: string
  } | null
  details: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    params?: Record<string, unknown>
  }
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
}

export interface SystemSetting {
  id: string
  key: string
  value: string
  description?: string | null
  updatedBy?: string | null
  updatedAt: string
}
