import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const rule = await prisma.accrualRule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!rule) {
      return NextResponse.json({
        id: 'default',
        name: 'Default Accrual Rule',
        standardLeavesPerYear: 18,
        emergencyLeavesPerYear: 2,
        accrualMethod: 'MONTHLY',
        daysPerMonth: 1.5,
        carryForwardEnabled: true,
        carryForwardMaxDays: 10,
        isActive: true,
        effectiveFrom: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      ...rule,
      effectiveFrom: rule.effectiveFrom.toISOString(),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const body = await req.json()

    const existingRule = await prisma.accrualRule.findFirst({
      where: { isActive: true },
    })

    let rule
    if (existingRule) {
      rule = await prisma.accrualRule.update({
        where: { id: existingRule.id },
        data: {
          standardLeavesPerYear: body.standardLeavesPerYear,
          emergencyLeavesPerYear: body.emergencyLeavesPerYear,
          accrualMethod: body.accrualMethod,
          daysPerMonth: body.daysPerMonth,
          carryForwardEnabled: body.carryForwardEnabled,
          carryForwardMaxDays: body.carryForwardMaxDays,
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
        },
      })
    } else {
      rule = await prisma.accrualRule.create({
        data: {
          standardLeavesPerYear: body.standardLeavesPerYear ?? 18,
          emergencyLeavesPerYear: body.emergencyLeavesPerYear ?? 2,
          accrualMethod: body.accrualMethod ?? 'MONTHLY',
          daysPerMonth: body.daysPerMonth ?? 1.5,
          carryForwardEnabled: body.carryForwardEnabled ?? true,
          carryForwardMaxDays: body.carryForwardMaxDays ?? 10,
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        },
      })
    }

    await logAudit('RULES_UPDATE', token.userId, null, {
      before: existingRule ?? {},
      after: rule,
      params: {},
    }, req)

    return NextResponse.json({
      ...rule,
      effectiveFrom: rule.effectiveFrom.toISOString(),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
