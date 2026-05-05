import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month')
    const employeeId = url.searchParams.get('employeeId')
    const all = url.searchParams.get('all') === 'true'

    const now = new Date()
    const refDate = monthParam ? new Date(`${monthParam}-01`) : now
    const start = startOfMonth(refDate)
    const end = endOfMonth(refDate)

    if (!['HR'].includes(token.role)) {
      const records = await prisma.attendanceRecord.findMany({
        where: { employeeId: token.userId, date: { gte: start, lte: end } },
        orderBy: { date: 'desc' },
      })
      return NextResponse.json(records)
    }

    if (all) {
      const records = await prisma.attendanceRecord.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
        include: {
          employee: { select: { displayName: true, workEmail: true, jobTitle: true } },
        },
      })
      return NextResponse.json(records)
    }

    const targetId = employeeId || token.userId
    const records = await prisma.attendanceRecord.findMany({
      where: { employeeId: targetId, date: { gte: start, lte: end } },
      orderBy: { date: 'desc' },
      include: {
        employee: { select: { displayName: true, workEmail: true, jobTitle: true } },
      },
    })
    return NextResponse.json(records)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
