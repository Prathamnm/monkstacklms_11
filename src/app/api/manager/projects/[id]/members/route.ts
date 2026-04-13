import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { createNotification } from '@/lib/notifications/notificationService'
import { logAudit } from '@/lib/audit/auditLogger'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'ADMIN'])

    const { id: projectId } = params
    const { employeeId } = await req.json()
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const existing = await prisma.employeeProject.findFirst({
      where: { projectId, employeeId },
    })

    let membership
    if (existing) {
      membership = await prisma.employeeProject.update({
        where: { id: existing.id },
        data: { isActive: true, removedAt: null },
      })
    } else {
      membership = await prisma.employeeProject.create({
        data: { projectId, employeeId },
      })
    }

    await createNotification({
      type: 'PROJECT_ASSIGNED',
      title: 'Added to Project',
      message: `You have been added to project "${project.name}"`,
      recipientId: employeeId,
      senderId: token.userId,
      referenceId: projectId,
    })

    await logAudit(
      'PROJECT_MEMBER_ADD',
      token.userId,
      employeeId,
      {
        before: {},
        after: { projectId, projectName: project.name },
        params: {},
      },
      req
    )

    return NextResponse.json(membership, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
