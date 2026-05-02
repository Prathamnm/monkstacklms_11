import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { id } = params

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
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
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({
      ...leave,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      approvedAt: leave.approvedAt?.toISOString() ?? null,
      rejectedAt: leave.rejectedAt?.toISOString() ?? null,
      revokedAt: leave.revokedAt?.toISOString() ?? null,
      cancelledAt: leave.cancelledAt?.toISOString() ?? null,
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
