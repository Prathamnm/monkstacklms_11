import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'

export async function GET(req: NextRequest) {
  try {
    await validateToken(req)

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        poster: { select: { displayName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(announcements)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR', 'ADMIN'])

    const body = await req.json()
    const { title, content } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        postedBy: token.userId,
      },
      include: {
        poster: { select: { displayName: true, role: true } },
      },
    })

    // Notify all active employees
    const activeEmployees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    await prisma.notification.createMany({
      data: activeEmployees.map((emp) => ({
        type: 'ANNOUNCEMENT_POSTED' as const,
        title: `Announcement: ${title}`,
        message: content.slice(0, 200),
        recipientId: emp.id,
        senderId: token.userId,
        referenceId: announcement.id,
      })),
    })

    await logAudit('ANNOUNCEMENT_POST', token.userId, null, {
      before: {},
      after: { announcementId: announcement.id, title },
      params: {},
    }, req)

    return NextResponse.json(announcement, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
