import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { calculateProratedLeaves, calculateProratedFloaterLeaves, calculateProratedEmergencyLeaves } from '@/lib/leave/prorateService'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['ADMIN', 'HR'])

    const year = new Date().getFullYear()
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true, displayName: true, joinDate: true },
    })

    const results = []
    for (const emp of employees) {
      const std   = calculateProratedLeaves(emp.joinDate, 18, year)
      const flt   = calculateProratedFloaterLeaves(emp.joinDate, 2, year)
      const emer  = calculateProratedEmergencyLeaves(emp.joinDate, 2, year)

      await prisma.leaveBalance.upsert({
        where: { employeeId: emp.id },
        create: {
          employeeId: emp.id, year,
          standardTotal: std, standardAccrued: std, standardUsed: 0, standardCarryForward: 0,
          floaterTotal: flt, floaterUsed: 0,
          emergencyTotal: emer, emergencyUsed: 0,
        },
        update: {
          year, standardTotal: std, floaterTotal: flt, emergencyTotal: emer,
        },
      })
      results.push({ name: emp.displayName, std, flt, emer })
    }

    return NextResponse.json({ message: `Fixed ${results.length} balances`, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
