import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { differenceInMinutes, parse, parseISO, format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

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

        // Robust date parsing for common formats (dd-MM-yyyy, yyyy-MM-dd, etc.)
        let dateObj: Date
        const dateStr = rec.date.trim()
        
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-')
          if (parts[0].length === 4) {
            // yyyy-MM-dd
            dateObj = parse(dateStr, 'yyyy-MM-dd', new Date())
          } else {
            // dd-MM-yyyy
            dateObj = parse(dateStr, 'dd-MM-yyyy', new Date())
          }
        } else if (dateStr.includes('/')) {
          const parts = dateStr.split('/')
          if (parts[0].length === 4) {
            // yyyy/MM/dd
            dateObj = parse(dateStr, 'yyyy/MM/dd', new Date())
          } else {
            // dd/MM/yyyy
            dateObj = parse(dateStr, 'dd/MM/yyyy', new Date())
          }
        } else {
          dateObj = parseISO(dateStr)
        }

        if (isNaN(dateObj.getTime())) {
          throw new Error(`Invalid date format: ${dateStr}. Expected DD-MM-YYYY or YYYY-MM-DD.`)
        }

        const dateBase = format(dateObj, 'yyyy-MM-dd')
        
        const punchInDt = rec.punchIn
          ? parse(`${dateBase} ${rec.punchIn}`, 'yyyy-MM-dd HH:mm', new Date())
          : null
        const punchOutDt = rec.punchOut
          ? parse(`${dateBase} ${rec.punchOut}`, 'yyyy-MM-dd HH:mm', new Date())
          : null

        let hoursWorked: number | null = null
        if (punchInDt && punchOutDt && !isNaN(punchInDt.getTime()) && !isNaN(punchOutDt.getTime())) {
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

    try {
      const { logAudit } = await import('@/lib/audit/auditLogger')
      await logAudit('ADMIN_OVERRIDE', token.userId, null, {
        action: 'ATTENDANCE_UPLOAD',
        batchId,
        processedCount: processed,
        errorCount: errors.length
      }, req)
    } catch (auditErr) {
      console.error('[Audit] Attendance upload log failed:', auditErr)
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
