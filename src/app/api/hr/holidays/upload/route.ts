import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { isValid, parse, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'

function parseHolidayDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    const parsedCode = XLSX.SSF.parse_date_code(serial)
    if (parsedCode) {
      const serialDate = new Date(parsedCode.y, parsedCode.m - 1, parsedCode.d)
      if (isValid(serialDate)) return serialDate
    }
  }

  const formats = ['yyyy-MM-dd', 'dd-MM-yyyy', 'yyyy/MM/dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'MMM d, yyyy', 'd MMM yyyy', 'dd MMM yyyy']
  for (const dateFormat of formats) {
    const parsed = parse(raw, dateFormat, new Date())
    if (isValid(parsed)) return parsed
  }

  const iso = parseISO(raw)
  return isValid(iso) ? iso : null
}

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

        const dateObj = parseHolidayDate(h.date)
        if (!dateObj) {
          throw new Error(`Invalid date format: ${String(h.date)}`)
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
