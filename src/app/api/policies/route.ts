import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    await validateToken(req)
    const policies = await prisma.policy.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(policies)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    if (!['HR', 'ADMIN'].includes(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const { title, fileName, fileUrl } = body
    if (!title || !fileUrl || !fileName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const policy = await prisma.policy.create({
      data: { title, fileName, fileUrl, uploadedBy: token.userId },
    })
    return NextResponse.json(policy, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
