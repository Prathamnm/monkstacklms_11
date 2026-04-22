import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      {
        status: 'ok',
        service: 'moonshine-lms',
        check: 'ready',
        database: 'reachable',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'moonshine-lms',
        check: 'ready',
        database: 'unreachable',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
