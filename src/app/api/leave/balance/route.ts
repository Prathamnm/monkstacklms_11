import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { getLeaveBalance } from '@/lib/leave/balanceService'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const balance = await getLeaveBalance(token.userId)
    return NextResponse.json(balance)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
