import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getLeaveBalance } from '@/lib/leave/balanceService'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const url = new URL(req.url)
    const employeeIdParam = url.searchParams.get('employeeId')

    let targetEmployeeId = token.userId

    if (employeeIdParam && employeeIdParam !== token.userId) {
      const subject = await prisma.employee.findUnique({
        where: { id: employeeIdParam },
        select: { id: true, managerId: true },
      })
      if (!subject) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
      if (!['MANAGER', 'HR', 'ADMIN'].includes(token.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (token.role === 'MANAGER' && subject.managerId !== token.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      targetEmployeeId = subject.id
    }

    const balance = await getLeaveBalance(targetEmployeeId)
    return NextResponse.json(balance)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
