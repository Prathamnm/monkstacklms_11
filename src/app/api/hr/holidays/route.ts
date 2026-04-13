import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'

export async function POST(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'MANAGER', 'ADMIN'])

    const body = await req.json()
    const { name, date, type, notes } = body

    if (!name || !date || !type) {
      return NextResponse.json({ error: 'name, date, and type are required' }, { status: 400 })
    }

    if (!['PUBLIC', 'FLOATER'].includes(type)) {
      return NextResponse.json({ error: 'type must be PUBLIC or FLOATER' }, { status: 400 })
    }

    const holidayDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (holidayDate < today) {
      return NextResponse.json({ error: 'Holiday date must be today or in the future' }, { status: 400 })
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        name,
        date: holidayDate,
        type,
        notes: notes ?? null,
        createdBy: token.userId,
      },
    })

    // Notify all active employees
    const activeEmployees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    const formattedDate = holidayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    await prisma.notification.createMany({
      data: activeEmployees.map((emp) => ({
        type: 'HOLIDAY_CREATED' as const,
        title: `New Holiday: ${name}`,
        message: `${type} holiday on ${formattedDate}`,
        recipientId: emp.id,
        senderId: token.userId,
        referenceId: holiday.id,
      })),
    })

    await logAudit('HOLIDAY_CREATE', token.userId, null, {
      before: {},
      after: { holidayId: holiday.id, name, date, type },
      params: {},
    }, req)

    return NextResponse.json({
      ...holiday,
      date: holiday.date.toISOString(),
      createdAt: holiday.createdAt.toISOString(),
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
