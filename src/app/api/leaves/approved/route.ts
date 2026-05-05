import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const { searchParams } = new URL(req.url)
    const teamId = (searchParams.get('teamId') ?? '').trim()
    const monthStr = (searchParams.get('month') ?? '').trim()
    const yearStr = (searchParams.get('year') ?? '').trim()

    if (!teamId || !monthStr || !yearStr) {
      return NextResponse.json({ error: 'Missing teamId/month/year', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const month = Number(monthStr)
    const year = Number(yearStr)
    if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month/year', code: 'BAD_REQUEST' }, { status: 400 })
    }

    if (token.role === 'MANAGER' && teamId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 1)

    const teamMembers = await prisma.employee.findMany({
      where: token.role === 'HR' ? { employmentStatus: 'ACTIVE' } : { managerId: teamId, employmentStatus: 'ACTIVE' },
      select: { id: true },
    })
    const memberIds = teamMembers.map((m) => m.id)
    if (memberIds.length === 0) return NextResponse.json({ count: 0 })

    const count = await prisma.leaveRequest.count({
      where: {
        employeeId: { in: memberIds },
        status: 'APPROVED',
        approvedAt: { gte: from, lt: to },
      },
    })

    return NextResponse.json({ count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }
    console.error('[/api/leaves/approved] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

