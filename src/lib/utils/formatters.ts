export function formatDays(days: number): string {
  if (days === 0) return '0 days';
  if (days === 0.5) return '0.5 days (half day)';

  return `${days} day${days === 1 ? '' : 's'}`;
}

export function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`
  return `${count} ${plural ?? singular + 's'}`
}

/** 
 * Robust first name extraction that filters out generic placeholders (hr1, manager1, etc.)
 */
export function getCleanFirstName(firstName?: string, displayName?: string): string {
  const fName = firstName || ''
  const dName = displayName || ''
  
  if (!fName || fName.toLowerCase().startsWith('hr') || fName.toLowerCase().startsWith('manager') || fName.toLowerCase().startsWith('employee') || fName.toLowerCase().startsWith('admin')) {
    // If first name is a placeholder, extract from full display name
    return dName.trim().split(/\s+/)[0] || 'User'
  }
  
  return fName
}

export function formatZonedDate(date: Date | string | null | undefined, timeZone: string = "UTC"): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  }
}
