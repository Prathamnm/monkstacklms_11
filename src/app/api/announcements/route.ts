import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'

export async function GET(req: NextRequest) {
  try {
    await validateToken(req)

    const { searchParams } = new URL(req.url)
    const limitRaw = (searchParams.get('limit') ?? '').trim()
    const limit = limitRaw ? Math.max(1, Math.min(50, Number(limitRaw))) : null

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      include: {
        poster: { select: { displayName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
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
    requireRole(token, ['MANAGER', 'HR'])

    const body = await req.json()
    const { title, content, body: bodyText, message } = body
    const normalizedBody = bodyText ?? content ?? message

    if (!title || !normalizedBody) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content: normalizedBody,
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
        message: normalizedBody.slice(0, 200),
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
