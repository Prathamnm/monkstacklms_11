import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    const settings = await prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    })

    return NextResponse.json(
      settings.map((s) => ({
        ...s,
        updatedAt: s.updatedAt.toISOString(),
      }))
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    const body = await req.json()

    const upserts = Object.entries(body).map(([key, value]) =>
      prisma.systemSettings.upsert({
        where: { key },
        create: { key, value: String(value), updatedBy: token.userId },
        update: { value: String(value), updatedBy: token.userId },
      })
    )

    await prisma.$transaction(upserts)

    return NextResponse.json({ message: 'Settings updated successfully' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
