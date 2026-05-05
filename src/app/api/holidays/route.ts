import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
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

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const { name, date, type = 'PUBLIC', notes } = await req.json()
    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 })
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        name,
        date: new Date(date),
        type,
        notes: notes || null,
        createdBy: token.userId,
      },
    })

    return NextResponse.json({
      id: holiday.id,
      name: holiday.name,
      date: holiday.date.toISOString(),
      type: holiday.type,
      notes: holiday.notes,
      createdBy: holiday.createdBy,
      createdAt: holiday.createdAt.toISOString(),
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
