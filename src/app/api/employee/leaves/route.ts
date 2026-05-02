import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)

    // Log employeeId for debugging
    console.log('[API /api/employee/leaves] Fetching leaves for employeeId:', token.userId)

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: token.userId },
      include: {
        approver: {
          select: { id: true, displayName: true, workEmail: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Log count and status breakdown for debugging
    const statusCounts = leaves.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log('[API /api/employee/leaves] Total leaves:', leaves.length, 'Status breakdown:', statusCounts)

    return NextResponse.json(
      leaves.map((l) => ({
        ...l,
        approver: l.approver ? { ...l.approver, email: (l.approver as any).workEmail } : null,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        approvedAt: l.approvedAt?.toISOString() ?? null,
        rejectedAt: l.rejectedAt?.toISOString() ?? null,
        revokedAt: l.revokedAt?.toISOString() ?? null,
        cancelledAt: l.cancelledAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      }))
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    console.error('[API /api/employee/leaves] Error:', message, err)
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
