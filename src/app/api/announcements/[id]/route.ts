import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const body = await req.json()
    const { title, content } = body

    const oldAnnouncement = await prisma.announcement.findUnique({
      where: { id: params.id },
    })

    if (!oldAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        title: title ?? oldAnnouncement.title,
        content: content ?? oldAnnouncement.content,
      },
    })

    await logAudit('ANNOUNCEMENT_POST', token.userId, null, {
      before: { title: oldAnnouncement.title, content: oldAnnouncement.content },
      after: { title: announcement.title, content: announcement.content },
      params: { announcementId: params.id },
    }, req)

    return NextResponse.json(announcement)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['MANAGER', 'HR'])

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    await prisma.announcement.update({
      where: { id: params.id },
      data: {
        isActive: false,
      },
    })

    await logAudit('ANNOUNCEMENT_DELETE', token.userId, null, {
      before: { announcementId: params.id, title: announcement.title },
      after: { deleted: true },
      params: {},
    }, req)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
