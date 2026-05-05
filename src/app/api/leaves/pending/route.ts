import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const { searchParams } = new URL(req.url)
    const managerId = (searchParams.get('managerId') ?? '').trim()
    if (!managerId) {
      return NextResponse.json({ error: 'Missing managerId', code: 'BAD_REQUEST' }, { status: 400 })
    }

    if (token.role !== 'ADMIN' && managerId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const teamMembers = await prisma.employee.findMany({
      where: { managerId, employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    const teamIds = teamMembers.map((m) => m.id)
    if (teamIds.length === 0) return NextResponse.json({ count: 0 })

    const count = await prisma.leaveRequest.count({
      where: { 
        OR: [
          { managerId: managerId },
          { employeeId: { in: teamIds }, managerId: null },
        ],
        status: 'PENDING' 
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
    console.error('[/api/leaves/pending] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

