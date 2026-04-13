import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { createNotification } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; membershipId: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN'])

    const { id: projectId, membershipId } = params

    const membership = await prisma.employeeProject.findUnique({
      where: { id: membershipId },
      include: { project: { select: { name: true, id: true } } },
    })
    if (!membership || membership.projectId !== projectId) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    await prisma.employeeProject.update({
      where: { id: membershipId },
      data: { isActive: false, removedAt: new Date() },
    })

    await createNotification({
      type: 'PROJECT_REMOVED',
      title: 'Removed from Project',
      message: `You have been removed from project "${membership.project.name}"`,
      recipientId: membership.employeeId,
      senderId: token.userId,
      referenceId: projectId,
    })

    await logAudit(
      'PROJECT_MEMBER_REMOVE',
      token.userId,
      membership.employeeId,
      {
        before: { isActive: true },
        after: { isActive: false, projectId },
        params: {},
      },
      req
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
