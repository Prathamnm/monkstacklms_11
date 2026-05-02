import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { differenceInMinutes, parse, parseISO } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const records: Array<{ email: string; date: string; punchIn: string; punchOut: string }> =
      await req.json()
    if (!Array.isArray(records)) {
      return NextResponse.json({ error: 'Expected JSON array' }, { status: 400 })
    }

    const batchId = `batch_${Date.now()}`
    let processed = 0
    const errors: string[] = []

    for (const rec of records) {
      try {
        const user = await prisma.employee.findFirst({
          where: { workEmail: rec.email },
          select: { id: true },
        })
        if (!user) {
          errors.push(`User not found: ${rec.email}`)
          continue
        }

        const dateObj = parseISO(rec.date)
        const punchInDt = rec.punchIn
          ? parse(`${rec.date} ${rec.punchIn}`, 'yyyy-MM-dd HH:mm', new Date())
          : null
        const punchOutDt = rec.punchOut
          ? parse(`${rec.date} ${rec.punchOut}`, 'yyyy-MM-dd HH:mm', new Date())
          : null

        let hoursWorked: number | null = null
        if (punchInDt && punchOutDt) {
          const rawMinutes = differenceInMinutes(punchOutDt, punchInDt)
          const netMinutes = Math.max(0, rawMinutes - 60)
          hoursWorked = Math.round((netMinutes / 60) * 10) / 10
        }

        await prisma.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: user.id, date: dateObj } },
          create: {
            employeeId: user.id,
            date: dateObj,
            punchIn: punchInDt,
            punchOut: punchOutDt,
            hoursWorked,
            uploadBatch: batchId,
          },
          update: {
            punchIn: punchInDt,
            punchOut: punchOutDt,
            hoursWorked,
            uploadBatch: batchId,
          },
        })
        processed++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Error processing ${rec.email} on ${rec.date}: ${msg}`)
      }
    }

    return NextResponse.json({ processed, errors, batchId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
