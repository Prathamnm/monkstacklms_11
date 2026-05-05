import { NextRequest, NextResponse } from 'next/server'
import { LeaveStatus } from '@prisma/client'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

const ALLOWED: LeaveStatus[] = ['APPROVED', 'REJECTED', 'PENDING', 'CANCELLED', 'REVOKED']

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const { searchParams } = new URL(req.url)
    const rawStatus = searchParams.get('status') ?? 'APPROVED'
    const status = ALLOWED.includes(rawStatus as LeaveStatus) ? (rawStatus as LeaveStatus) : 'APPROVED'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status,
        ...(token.role === 'HR' ? {} : { approverId: token.userId }),
        ...(from && to
          ? {
              approvedAt: {
                gte: new Date(from),
                lte: new Date(to),
              },
            }
          : {}),
      },
      select: { id: true, totalDays: true, approvedAt: true },
    })

    return NextResponse.json(leaves)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
