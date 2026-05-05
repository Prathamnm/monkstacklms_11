import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { syncGraphUsersToDatabase } from '@/lib/auth/azureTenantSync'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    try {
      await syncGraphUsersToDatabase({ removeOrphans: true })
    } catch (graphErr) {
      console.error('[/api/hr/users] Azure sync failed, continuing with DB data:', graphErr)
    }

    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        workEmail: true,
        notificationEmail: true,
        entraObjectId: true,
        role: true,
        employmentStatus: true,
        jobTitle: true,
        joinDate: true,
      },
    })

    return NextResponse.json(employees.map(e => ({ ...e, email: e.workEmail })))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
