import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN', 'HR'])

    const { teamId } = await ctx.params
    const normalizedTeamId = (teamId ?? '').trim()
    if (!normalizedTeamId) {
      return NextResponse.json({ error: 'Missing teamId', code: 'BAD_REQUEST' }, { status: 400 })
    }

    if (token.role === 'MANAGER' && normalizedTeamId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = (searchParams.get('status') ?? 'active').toLowerCase()

    const where: Prisma.EmployeeWhereInput = token.role === 'ADMIN'
      ? {}
      : { managerId: normalizedTeamId }
    if (status === 'active') where.employmentStatus = 'ACTIVE'

    const count = await prisma.employee.count({
      where: {
        ...where,
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
    console.error('[/api/teams/[teamId]/members] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
