import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

import { AuditAction } from '@prisma/client'

export async function logAudit(
  action: AuditAction,
  performedById: string,
  targetId: string | null,
  details: object,
  req?: NextRequest
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        performedBy: performedById,
        targetId,
        details,
        ipAddress: req?.headers.get('x-forwarded-for') ?? req?.ip ?? null,
        userAgent: req?.headers.get('user-agent') ?? null,
      },
    })
  } catch (err) {
    // Audit logging failure should NOT block the main operation
    console.error('[AuditLogger] Failed to write audit log:', err)
  }
}
