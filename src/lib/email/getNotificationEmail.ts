import type { Employee } from '@prisma/client'

/**
 * Returns the best email address to send notifications to for a given employee.
 * Preference order:
 *   1) notificationEmail (if non-empty)
 *   2) workEmail
 */
export function getNotificationEmail(
  employee: Pick<Employee, 'workEmail' | 'notificationEmail'>
): string {
  const trimmedNotification = employee.notificationEmail?.trim()
  if (trimmedNotification) return trimmedNotification
  return employee.workEmail || ''
}
