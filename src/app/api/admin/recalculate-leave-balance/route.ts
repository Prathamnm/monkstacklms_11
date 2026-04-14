import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { calculateProratedLeaves, calculateProratedEmergencyLeaves } from '@/lib/leave/prorateService'

/**
 * POST /api/admin/recalculate-leave-balance
 * 
 * Recalculates and updates leave balances for employees based on their joining date.
 * Useful when you want to fix existing employee records.
 * Admin/HR only.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const body = await req.json()
    const { employeeId, force } = body

    // Get all employees or specific employee
    const employees = employeeId
      ? await prisma.employee.findMany({
          where: { id: employeeId },
          select: { id: true, displayName: true, joinDate: true },
        })
      : await prisma.employee.findMany({
          where: { employmentStatus: 'ACTIVE' },
          select: { id: true, displayName: true, joinDate: true },
        })

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'No employees found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const year = new Date().getFullYear()
    const results: Array<{ employeeId: string; name: string; before: number; after: number }> = []

    for (const employee of employees) {
      const currentBalance = await prisma.leaveBalance.findUnique({
        where: { employeeId: employee.id },
      })

      if (!currentBalance) continue

      const proratedStandard = calculateProratedLeaves(employee.joinDate, 18, year)
      const proratedEmergency = calculateProratedEmergencyLeaves(employee.joinDate, 2, year)

      // Only update if different or if force is true
      if (force || currentBalance.standardTotal !== proratedStandard) {
        await prisma.leaveBalance.update({
          where: { employeeId: employee.id },
          data: {
            standardTotal: proratedStandard,
            emergencyTotal: proratedEmergency,
          },
        })

        results.push({
          employeeId: employee.id,
          name: employee.displayName,
          before: currentBalance.standardTotal,
          after: proratedStandard,
        })

        await logAudit('BALANCE_ADJUST', token.userId, employee.id, {
          before: { standardTotal: currentBalance.standardTotal, emergencyTotal: currentBalance.emergencyTotal },
          after: { standardTotal: proratedStandard, emergencyTotal: proratedEmergency },
          params: { reason: 'Recalculated leaves based on joining date' },
        }, req)
      }
    }

    return NextResponse.json(
      {
        message: `Updated ${results.length} employee(s)`,
        updated: results,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED')
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    if (message === 'FORBIDDEN')
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
