import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { runMonthlyAccrual } from '@/lib/leave/accrualEngine'
import { logAudit } from '@/lib/audit/auditLogger'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    const result = await runMonthlyAccrual()

    await logAudit('ACCRUAL_RUN', token.userId, null, {
      before: {},
      after: { processed: result.processed, errors: result.errors },
      params: { triggeredBy: token.email },
    }, req)

    return NextResponse.json({
      message: `Accrual run completed. Processed: ${result.processed} employees.`,
      ...result,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    console.error('[/api/accrual/run] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
