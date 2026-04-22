import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function resolveDatasourceUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL?.trim()
  if (!rawUrl) return undefined

  // Local safeguard: many setups run postgres on 5432 while legacy env files still reference 5433.
  if (process.env.NODE_ENV !== 'production' && rawUrl.includes('localhost:5433')) {
    return rawUrl.replace('localhost:5433', 'localhost:5432')
  }
  return rawUrl
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
