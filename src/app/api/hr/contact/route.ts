import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    await validateToken(req)

    const hrEmployees = await prisma.employee.findMany({
      where: { role: 'HR', employmentStatus: 'ACTIVE' },
      select: { workEmail: true, displayName: true },
    })

    return NextResponse.json(hrEmployees.map(e => ({ ...e, email: e.workEmail })))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
