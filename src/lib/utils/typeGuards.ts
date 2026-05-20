export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key]
  return typeof value === 'string' ? value : undefined
}

export function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key]
  return typeof value === 'number' ? value : undefined
}

export function getBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const value = obj[key]
  return typeof value === 'boolean' ? value : undefined
}

export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
