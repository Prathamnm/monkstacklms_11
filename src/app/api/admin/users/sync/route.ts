import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { syncGraphUsersToDatabase } from '@/lib/auth/azureTenantSync'

function isCronAuthorized(req: NextRequest): boolean {
  const expected = process.env.USER_SYNC_CRON_SECRET?.trim()
  const provided = req.headers.get('x-sync-secret')?.trim()
  return Boolean(expected && provided && expected === provided)
}

export async function POST(req: NextRequest) {
  try {
    const authorizedBySecret = isCronAuthorized(req)
    if (!authorizedBySecret) {
      const token = await validateToken(req)
      requireRole(token, ['HR'])
    }

    const result = await syncGraphUsersToDatabase({ removeOrphans: true })
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
