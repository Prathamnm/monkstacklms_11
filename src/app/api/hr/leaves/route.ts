import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const statuses = statusFilter
      ? statusFilter.split(',').map((s) => s.trim()).filter(Boolean) as Array<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED'>
      : null
    const employeeId = searchParams.get('employeeId')

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(statuses && statuses.length > 0
          ? { status: { in: statuses } }
          : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            workEmail: true,

            jobTitle: true,
            profilePictureUrl: true,
          },
        },
        approver: {
          select: { id: true, displayName: true, workEmail: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      leaves.map((l) => ({
        ...l,
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
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
