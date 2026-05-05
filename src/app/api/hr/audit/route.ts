import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { AuditAction } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50')

    const logs = await prisma.auditLog.findMany({
      where: action ? { action: action as any } : {},
      include: {
        target: { select: { id: true, displayName: true, workEmail: true } },
        performer: { select: { id: true, displayName: true, workEmail: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    })

    return NextResponse.json(
      logs.map((log) => ({
        ...log,
        createdAt: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(),
      }))
    )
  } catch (err: any) {
    console.error('[API/HR/AUDIT] Global Error:', err)
    
    return NextResponse.json({ 
      error: 'Failed to fetch audit logs', 
      details: err.message || String(err),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 })
  }
}
