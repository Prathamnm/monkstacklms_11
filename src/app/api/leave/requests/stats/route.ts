import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || token.userId

    // Access control: only self or HR/Manager/Admin can view stats
    if (userId !== token.userId && !['MANAGER', 'HR'].includes(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const [totalThisMonth, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.leaveRequest.count({
        where: {
          employeeId: userId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          employeeId: userId,
          status: 'PENDING',
        },
      }),
      prisma.leaveRequest.count({
        where: {
          employeeId: userId,
          status: 'APPROVED',
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          employeeId: userId,
          status: 'REJECTED',
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
    ])

    return NextResponse.json({
      totalThisMonth,
      pendingCount,
      approvedCount,
      rejectedCount,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
