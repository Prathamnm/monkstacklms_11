export interface PublicHoliday {
  id: string
  name: string
  date: string // ISO string
  type: 'PUBLIC' | 'FLOATER'
  notes?: string | null
  createdBy: string
  createdAt: string
}
