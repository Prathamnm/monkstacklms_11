import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function normalizeEnvValue(value: string | undefined): string {
  const normalized = value?.trim() ?? ''
  if (!normalized) return ''
  const lowered = normalized.toLowerCase()
  if (lowered === 'undefined' || lowered === 'null') return ''
  return normalized
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim()
  }
  return value
}

function stripAngleBrackets(value: string): string {
  return value.replace(/[<>]/g, '')
}

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizePostgresCredentials(value: string): string {
  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    return value
  }

  // Keep the final '@' as the auth/host separator; this handles unencoded '@' in usernames.
  const schemeMatch = value.match(/^(postgres(?:ql)?:\/\/)/)
  if (!schemeMatch) return value
  const scheme = schemeMatch[1]
  const rest = value.slice(scheme.length)
  const atIdx = rest.lastIndexOf('@')
  if (atIdx <= 0) return value

  const authPart = rest.slice(0, atIdx)
  const hostPart = rest.slice(atIdx + 1)
  const colonIdx = authPart.indexOf(':')
  if (colonIdx <= 0) return value

  const rawUser = authPart.slice(0, colonIdx)
  const rawPass = authPart.slice(colonIdx + 1)
  const user = encodeURIComponent(decodeSafely(rawUser))
  const pass = encodeURIComponent(decodeSafely(rawPass))
  return `${scheme}${user}:${pass}@${hostPart}`
}

function ensureAzureSslMode(value: string): string {
  try {
    const parsed = new URL(value)
    const isAzurePostgres = parsed.hostname.endsWith('.postgres.database.azure.com')
    if (isAzurePostgres && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require')
    }
    return parsed.toString()
  } catch {
    return value
  }
}

function resolveDatasourceUrl(): string | undefined {
  const rawUrl =
    normalizeEnvValue(process.env.DATABASE_URL) ||
    normalizeEnvValue(process.env.POSTGRES_PRISMA_URL) ||
    normalizeEnvValue(process.env.POSTGRES_URL) ||
    normalizeEnvValue(process.env.POSTGRESQLCONNSTR_DATABASE_URL)
  if (!rawUrl) {
    console.warn('[Prisma] No DATABASE_URL found in environment variables.')
    return undefined
  }

  const cleaned = stripAngleBrackets(stripWrappingQuotes(rawUrl))
  const credentialSafe = normalizePostgresCredentials(cleaned)
  const finalUrl = ensureAzureSslMode(credentialSafe)
  console.log('[Prisma] Resolved datasource URL (host only):', new URL(finalUrl).host)
  return finalUrl
}

const datasourceUrl = resolveDatasourceUrl()
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    datasourceUrl
      ? {
          datasources: {
            db: { url: datasourceUrl },
          },
        }
      : undefined
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
