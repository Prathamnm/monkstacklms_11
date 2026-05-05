import { NextRequest, NextResponse } from 'next/server'
import { startOfDay, endOfDay } from 'date-fns'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase() || 'U'
}

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const { searchParams } = new URL(req.url)
    const teamId = (searchParams.get('teamId') ?? '').trim()
    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId', code: 'BAD_REQUEST' }, { status: 400 })
    }

    if (token.role === 'MANAGER' && teamId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const teamMembers = await prisma.employee.findMany({
      where: token.role === 'HR' ? { employmentStatus: 'ACTIVE' } : { managerId: teamId, employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    const memberIds = teamMembers.map((m) => m.id)
    if (memberIds.length === 0) return NextResponse.json({ count: 0, members: [] })

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: memberIds },
        status: 'APPROVED',
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      select: { employee: { select: { displayName: true } } },
      orderBy: { startDate: 'asc' },
    })

    const members = leaves
      .map((l) => l.employee.displayName)
      .filter(Boolean)
      .map((name) => ({ name, avatarInitials: initialsFromName(name) }))

    return NextResponse.json({ count: members.length, members })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }
    console.error('[/api/leaves/active-today] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

