import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase() || 'U'
}

function colorFromSeed(seed: string) {
  const palette = ['blue', 'green', 'amber', 'red', 'purple'] as const
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const token = await validateToken(req)
    const { userId } = await ctx.params
    const requestedId = (userId ?? '').trim()
    if (!requestedId) {
      return NextResponse.json({ error: 'Missing userId', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Users can always read their own profile; elevated roles can read any.
    const isSelf = requestedId === token.userId
    const isElevated = token.role === 'HR'
    if (!isSelf && !isElevated) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const emp = await prisma.employee.findUnique({
      where: { id: requestedId },
      select: { id: true, displayName: true, jobTitle: true, role: true },
    })
    if (!emp) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json({
      name: emp.displayName,
      designation: emp.jobTitle ?? emp.role,
      role: emp.role,
      avatarInitials: initialsFromName(emp.displayName),
      avatarColor: colorFromSeed(emp.id),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }
    console.error('[/api/users/[userId]/profile] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

