export interface Announcement {
  id: string
  title: string
  content: string
  postedBy: string
  poster: {
    displayName: string
    role: string
  }
  isActive: boolean
  createdAt: string
  deletedAt?: string | null
  deletedBy?: string | null
}
