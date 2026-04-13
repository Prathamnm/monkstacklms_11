import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { getAppAccessToken } from '@/lib/auth/graphClient'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN'])

    if (params.id === token.userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 })
    }

    const body = await req.json()
    const { role } = body

    if (!['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({ where: { id: params.id } })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const oldRole = employee.role

    await prisma.employee.update({
      where: { id: params.id },
      data: { role },
    })

    // Sync Entra groups (best-effort)
    try {
      if (employee.entraObjectId && !employee.entraObjectId.startsWith('pending-')) {
        const accessToken = await getAppAccessToken()

        const roleGroupEnvMap: Record<string, string | undefined> = {
          EMPLOYEE: process.env.ENTRA_GROUP_ID_LMS_EMPLOYEES,
          MANAGER: process.env.ENTRA_GROUP_ID_LMS_MANAGERS,
          HR: process.env.ENTRA_GROUP_ID_LMS_HR,
          ADMIN: process.env.ENTRA_GROUP_ID_LMS_ADMINS,
        }

        const oldGroupId = roleGroupEnvMap[oldRole]
        const newGroupId = roleGroupEnvMap[role]

        if (oldGroupId) {
          await fetch(`https://graph.microsoft.com/v1.0/groups/${oldGroupId}/members/${employee.entraObjectId}/$ref`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        }

        if (newGroupId) {
          await fetch(`https://graph.microsoft.com/v1.0/groups/${newGroupId}/members/$ref`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${employee.entraObjectId}` }),
          })
        }
      }
    } catch (graphErr) {
      console.error('[role-change] Entra sync error (non-fatal):', graphErr)
    }

    // Notify employee
    await prisma.notification.create({
      data: {
        type: 'ROLE_CHANGED',
        title: 'Your Role Has Been Updated',
        message: `Your role has been changed from ${oldRole} to ${role}. Please log out and back in.`,
        recipientId: params.id,
        senderId: token.userId,
      },
    })

    await logAudit('ROLE_CHANGE', token.userId, params.id, {
      before: { role: oldRole },
      after: { role },
      params: {},
    }, req)

    return NextResponse.json({ success: true, role })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
