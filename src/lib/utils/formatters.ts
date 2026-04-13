export function formatDays(days: number): string {
  if (days === 0) return '0 days'
  if (days === 0.5) return '0.5 days (half day)'
  if (days === 1) return '1 day'
  if (days % 1 === 0.5) return `${days} days`
  return `${days} days`
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

