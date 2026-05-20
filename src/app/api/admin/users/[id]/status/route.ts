import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { getAppAccessToken } from '@/lib/auth/graphClient'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    if (id === token.userId) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 403 })
    }

    const body = await req.json()
    const { status } = body

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ error: 'status must be ACTIVE or INACTIVE' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({ where: { id } })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    await prisma.employee.update({
      where: { id },
      data: { employmentStatus: status },
    })

    // Disable Entra account if deactivating (best-effort)
    if (status === 'INACTIVE') {
      try {
        if (employee.entraObjectId && !employee.entraObjectId.startsWith('pending-')) {
          const accessToken = await getAppAccessToken()
          await fetch(`https://graph.microsoft.com/v1.0/users/${employee.entraObjectId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountEnabled: false }),
          })
        }
      } catch (graphErr) {
        console.error('[status-change] Entra sync error (non-fatal):', graphErr)
      }
    }

    await prisma.notification.create({
      data: {
        type: 'ACCOUNT_DEACTIVATED',
        title: status === 'INACTIVE' ? 'Your Account Has Been Deactivated' : 'Your Account Has Been Reactivated',
        message: status === 'INACTIVE'
          ? 'Your account has been deactivated by an administrator.'
          : 'Your account has been reactivated by an administrator.',
        recipientId: id,
        senderId: token.userId,
      },
    })

    await logAudit('ACCOUNT_DEACTIVATE', token.userId, id, {
      before: { status: employee.employmentStatus },
      after: { status },
      params: {},
    }, req)

    return NextResponse.json({ success: true, status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
