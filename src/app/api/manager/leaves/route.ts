import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const teamMembers = await prisma.employee.findMany({
      where: { managerId: token.userId, employmentStatus: 'ACTIVE' },
      select: { id: true },
    })
    const teamIds = teamMembers.map((m) => m.id)
    const useAllEmployees = token.role === 'HR' || teamIds.length === 0

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(useAllEmployees ? {} : { employeeId: { in: teamIds } }),
        status: { in: ['PENDING', 'APPROVED'] },
        ...(from && to
          ? {
              startDate: { lte: new Date(to) },
              endDate: { gte: new Date(from) },
            }
          : {}),
      },
      include: {
        employee: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      leaves.map((l) => ({
        ...l,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
      }))
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
