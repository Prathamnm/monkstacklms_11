import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { parse, parseISO } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR'])

    const holidays: Array<{ name: string; date: string; type?: string; notes?: string }> = await req.json()
    if (!Array.isArray(holidays)) {
      return NextResponse.json({ error: 'Expected JSON array' }, { status: 400 })
    }

    let processed = 0
    const errors: string[] = []

    for (const h of holidays) {
      try {
        if (!h.name || !h.date) {
          errors.push(`Missing name or date for record: ${JSON.stringify(h)}`)
          continue
        }

        let dateObj: Date
        const dateStr = h.date.trim()
        
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-')
          if (parts[0].length === 4) {
            dateObj = parse(dateStr, 'yyyy-MM-dd', new Date())
          } else {
            dateObj = parse(dateStr, 'dd-MM-yyyy', new Date())
          }
        } else if (dateStr.includes('/')) {
          const parts = dateStr.split('/')
          if (parts[0].length === 4) {
            dateObj = parse(dateStr, 'yyyy/MM/dd', new Date())
          } else {
            dateObj = parse(dateStr, 'dd/MM/yyyy', new Date())
          }
        } else {
          dateObj = parseISO(dateStr)
        }

        if (isNaN(dateObj.getTime())) {
          throw new Error(`Invalid date format: ${dateStr}`)
        }

        await prisma.publicHoliday.create({
          data: {
            name: h.name,
            date: dateObj,
            type: (h.type?.toUpperCase() === 'FLOATER' ? 'FLOATER' : 'PUBLIC') as any,
            notes: h.notes || null,
            createdBy: token.userId
          }
        })
        processed++
      } catch (err: unknown) {
        errors.push(`Error processing ${h.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({ processed, errors })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
