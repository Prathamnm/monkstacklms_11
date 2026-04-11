import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED' } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            email: true,
            department: true,
            jobTitle: true,
            profilePictureUrl: true,
          },
        },
        approver: {
          select: { id: true, displayName: true, email: true },
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
