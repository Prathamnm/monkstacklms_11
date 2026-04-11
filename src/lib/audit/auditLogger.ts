import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

type AuditAction =
  | 'LEAVE_APPLY'
  | 'LEAVE_APPROVE'
  | 'LEAVE_REJECT'
  | 'LEAVE_CANCEL'
  | 'LEAVE_REVOKE'
  | 'BALANCE_ADJUST'
  | 'EMPLOYEE_ONBOARD'
  | 'EMPLOYEE_OFFBOARD'
  | 'EMPLOYEE_UPDATE'
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'PROJECT_MEMBER_ADD'
  | 'PROJECT_MEMBER_REMOVE'
  | 'RULES_UPDATE'
  | 'ACCRUAL_RUN'

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
