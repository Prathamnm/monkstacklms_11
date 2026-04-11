import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAppAccessToken, createGraphClient } from '@/lib/auth/graphClient'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    // Fetch all DB employees for sync status check
    const dbEmployees = await prisma.employee.findMany({
      select: { entraObjectId: true, role: true },
    })
    const dbMap = new Map(dbEmployees.map((e) => [e.entraObjectId, e]))

    try {
      // Fetch users from Entra via Graph API
      const appToken = await getAppAccessToken()
      const client = createGraphClient(appToken)
      const response = await client.api('/users').select('id,displayName,userPrincipalName').get()

      const users = (response.value ?? []).map((user: { id: string; displayName: string; userPrincipalName: string }) => ({
        id: user.id,
        displayName: user.displayName,
        userPrincipalName: user.userPrincipalName,
        entraObjectId: user.id,
        syncedToDb: dbMap.has(user.id),
        role: dbMap.get(user.id)?.role ?? null,
      }))

      return NextResponse.json(users)
    } catch {
      // If Graph fails, return DB employees
      const employees = await prisma.employee.findMany({
        select: {
          id: true,
          displayName: true,
          email: true,
          entraObjectId: true,
          role: true,
        },
      })

      return NextResponse.json(
        employees.map((e) => ({
          id: e.id,
          displayName: e.displayName,
          userPrincipalName: e.email,
          entraObjectId: e.entraObjectId,
          syncedToDb: true,
          role: e.role,
        }))
      )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
