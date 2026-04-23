import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim()
  }
  return value
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
  const rawUrl = process.env.DATABASE_URL?.trim()
  if (!rawUrl) return undefined

  const normalizedUrl = ensureAzureSslMode(stripWrappingQuotes(rawUrl))

  // Local safeguard: many setups run postgres on 5432 while legacy env files still reference 5433.
  if (process.env.NODE_ENV !== 'production' && normalizedUrl.includes('localhost:5433')) {
    return normalizedUrl.replace('localhost:5433', 'localhost:5432')
  }
  return normalizedUrl
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
