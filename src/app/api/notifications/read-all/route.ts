import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)

    await prisma.notification.updateMany({
      where: { recipientId: token.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ message: 'All notifications marked as read' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
