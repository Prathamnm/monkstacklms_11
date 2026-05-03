import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN'])

    // Find team members (employees whose manager is the current user)
    const teamMembers = await prisma.employee.findMany({
      where: { managerId: token.userId, employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    const teamIds = teamMembers.map((m) => m.id)

    const useAllEmployees = token.role === 'ADMIN'

    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const approvals = await prisma.leaveRequest.findMany({
      where: {
        ...(!useAllEmployees && teamIds.length > 0
          ? {
              OR: [
                { managerId: token.userId },
                { AND: [{ employeeId: { in: teamIds } }, { managerId: null }] },
              ],
            }
          : useAllEmployees
          ? {}
          : { managerId: token.userId }),
        ...(status && status !== 'ALL' ? { status: status as any } : { status: 'PENDING' }),
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
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      approvals.map((a) => ({
        ...a,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        approvedAt: a.approvedAt?.toISOString() ?? null,
        rejectedAt: a.rejectedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
