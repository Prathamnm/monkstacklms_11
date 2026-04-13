import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { stringify } from 'csv-stringify/sync'
import { utils, write } from 'xlsx'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? 'leave-summary'
    const exportFormat = searchParams.get('format') ?? 'csv'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = to ? new Date(to) : new Date()

    let rows: Record<string, unknown>[] = []
    let filename = 'report'

    switch (type) {
      case 'leave-summary': {
        const leaves = await prisma.leaveRequest.findMany({
          where: {
            startDate: { gte: fromDate },
            endDate: { lte: toDate },
          },
          include: {
            employee: { select: { displayName: true, email: true } },
            approver: { select: { displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
        })

        rows = leaves.map((l) => ({
          Employee: l.employee.displayName,
          Email: l.employee.email,
          'Start Date': format(l.startDate, 'yyyy-MM-dd'),
          'End Date': format(l.endDate, 'yyyy-MM-dd'),
          'Total Days': l.totalDays,
          Status: l.status,
          Reason: l.reason,
          Approver: l.approver?.displayName ?? '',
        }))
        filename = `leave-summary-${format(fromDate, 'yyyy-MM-dd')}-${format(toDate, 'yyyy-MM-dd')}`
        break
      }

      case 'leave-balance': {
        const balances = await prisma.leaveBalance.findMany({
          include: {
            employee: { select: { displayName: true, email: true } },
          },
          where: { year: new Date().getFullYear() },
        })

        rows = balances.map((b) => ({
          Employee: b.employee.displayName,
          Email: b.employee.email,
          'Accrued': b.standardAccrued,
          'Used': b.standardUsed,
          'Carry Forward': b.standardCarryForward,
          'Available': b.standardAccrued + b.standardCarryForward - b.standardUsed,
          'Emergency Total': b.emergencyTotal,
          'Emergency Used': b.emergencyUsed,
          'Emergency Available': b.emergencyTotal - b.emergencyUsed,
        }))
        filename = 'leave-balance'
        break
      }

      case 'employee-directory': {
        const employees = await prisma.employee.findMany({
          where: { employmentStatus: 'ACTIVE' },
          orderBy: { firstName: 'asc' },
        })

        rows = employees.map((e) => ({
          Name: e.displayName,
          Email: e.email,
          'Job Title': e.jobTitle ?? '',
          Phone: e.phoneNumber ?? '',
          Role: e.role,
          'Join Date': format(e.joinDate, 'yyyy-MM-dd'),
        }))
        filename = 'employee-directory'
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown report type', code: 'BAD_REQUEST' }, { status: 400 })
    }

    if (exportFormat === 'csv') {
      const csv = stringify(rows, { header: true })
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else {
      const ws = utils.json_to_sheet(rows)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Report')
      const buf = write(wb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    console.error('[/api/hr/reports/export] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
