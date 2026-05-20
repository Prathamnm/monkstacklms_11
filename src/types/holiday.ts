import { HolidayType } from '@/constants'

export interface PublicHoliday {
  id: string
  name: string
  date: string
  type: HolidayType
  notes?: string | null
  createdBy: string
  createdAt: string
}
