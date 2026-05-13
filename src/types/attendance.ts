export interface AttendanceRecord {
  id: string
  date: string
  punchIn: string | null
  punchOut: string | null
  hoursWorked: number | null
  employee?: {
    id: string
    displayName: string
    email: string
    jobTitle?: string | null
  }
}

export interface ParsedAttendanceRow {
  email: string
  date: string
  punchIn: string
  punchOut: string
}
