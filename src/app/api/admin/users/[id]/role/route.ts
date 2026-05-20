import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { getAppAccessToken } from '@/lib/auth/graphClient'
import type { Role } from '@prisma/client'
import { sendMail } from '@/lib/email/acsMailer'
import { wrapEmailBody, detailRow, detailCard } from '@/lib/email/templates/shared'
import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const body = await req.json()
    const { role } = body
    const nextRole = role as Role

    if (!['EMPLOYEE', 'MANAGER', 'HR'].includes(nextRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { id: rawIdentifier } = params
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: rawIdentifier },
          { entraObjectId: rawIdentifier },
          { workEmail: { equals: rawIdentifier, mode: 'insensitive' } },
        ],
      },
    })

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    if (employee.id === token.userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 })
    }

    const oldRole = employee.role
    if (oldRole === nextRole) return NextResponse.json({ success: true, role: nextRole })

    // Part 7.1: Sync Entra groups FIRST
    if (employee.entraObjectId && !employee.entraObjectId.startsWith('pending-')) {
      try {
        const accessToken = await getAppAccessToken()

        const roleGroupEnvMap: Record<string, string | undefined> = {
          EMPLOYEE: process.env.ENTRA_GROUP_ID_LMS_EMPLOYEES,
          MANAGER: process.env.ENTRA_GROUP_ID_LMS_MANAGERS,
          HR: process.env.ENTRA_GROUP_ID_LMS_HR,
          ADMIN: process.env.ENTRA_GROUP_ID_LMS_ADMINS,
        }

        const oldGroupId = roleGroupEnvMap[oldRole]
        const newGroupId = roleGroupEnvMap[nextRole]

        // 1. Remove from old group
        if (oldGroupId) {
          const resDelete = await fetch(`https://graph.microsoft.com/v1.0/groups/${oldGroupId}/members/${employee.entraObjectId}/$ref`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (!resDelete.ok && resDelete.status !== 404) {
            const errBody = await resDelete.text()
            throw new Error(`Failed to remove from old group: ${errBody}`)
          }
        }

        // 2. Add to new group
        if (newGroupId) {
          const resPost = await fetch(`https://graph.microsoft.com/v1.0/groups/${newGroupId}/members/$ref`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${employee.entraObjectId}` }),
          })
          if (!resPost.ok && resPost.status !== 409) { // 409 means already a member
            const errBody = await resPost.text()
            throw new Error(`Failed to add to new group: ${errBody}`)
          }
        }
      } catch (graphErr: any) {
        console.error('[role-change] Entra sync error (FATAL):', graphErr)
        return NextResponse.json({ 
          error: 'Failed to sync with Azure Entra ID. Security role was not updated in database. Please ensure groups are correctly configured in .env', 
          details: graphErr.message 
        }, { status: 500 })
      }
    }

    // Notify employee
    await prisma.notification.create({
      data: {
        type: 'ROLE_CHANGED',
        title: 'Your Role Has Been Updated',
        message: `Your role has been changed from ${oldRole} to ${nextRole}. Please log out and back in to see the changes.`,
        recipientId: employee.id,
        senderId: token.userId,
      },
    })

    await logAudit('ROLE_CHANGE', token.userId, employee.id, {
      before: { role: oldRole },
      after: { role: nextRole },
      params: {},
    }, req)

    // Send Email
    const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const rows = [
      detailRow('Previous Role', oldRole),
      detailRow('New Role',      nextRole),
      detailRow('Effective',     'Immediately — please log out and log back in'),
    ].join('\n')

    const htmlBody = wrapEmailBody({
      preheader:  'Your role in Monkstack HRM has been updated',
      badgeText:  '🔄 Role Updated',
      badgeColor: 'blue',
      headline:   'Your access role has been updated',
      bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                     Your role in the Monkstack HRM system has been changed. 
                     Please log out and log back in for the new permissions to take effect.
                     If you believe this is an error, contact HR immediately.
                   </p>${detailCard(rows)}`,
      buttons: [{ label: 'Go to Login', url: `${appBaseUrl}/login` }],
    })
    const subject = `[Monkstack HRM] Your role has been updated to ${nextRole}`

    await sendMail({ to: [getNotificationEmail(employee)], subject, htmlBody }).catch(console.error)

    return NextResponse.json({
      success: true,
      message: `Role update submitted to Azure. ${employee.displayName} will see the change on their next login.`,
      pendingRole: nextRole,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[role-change] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
