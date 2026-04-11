import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50')

    const logs = await prisma.auditLog.findMany({
      where: action ? { action: action as 'LEAVE_APPLY' | 'LEAVE_APPROVE' | 'LEAVE_REJECT' | 'LEAVE_CANCEL' | 'LEAVE_REVOKE' | 'BALANCE_ADJUST' | 'EMPLOYEE_ONBOARD' | 'EMPLOYEE_OFFBOARD' | 'EMPLOYEE_UPDATE' | 'PROJECT_CREATE' | 'PROJECT_UPDATE' | 'PROJECT_MEMBER_ADD' | 'PROJECT_MEMBER_REMOVE' | 'RULES_UPDATE' | 'ACCRUAL_RUN' } : {},
      include: {
        performer: { select: { id: true, displayName: true, email: true } },
        target: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    })

    return NextResponse.json(
      logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      }))
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
