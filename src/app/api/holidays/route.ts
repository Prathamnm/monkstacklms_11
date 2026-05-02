import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    await validateToken(req)

    const holidays = await prisma.publicHoliday.findMany({
      orderBy: { date: 'asc' },
    })

    const result = holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString(),
      type: h.type,
      notes: h.notes,
      createdBy: h.createdBy,
      createdAt: h.createdAt.toISOString(),
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
