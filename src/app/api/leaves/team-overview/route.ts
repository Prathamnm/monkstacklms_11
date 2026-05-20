import { NextRequest, NextResponse } from 'next/server'
import { parseISO, format } from 'date-fns'
import type { Prisma } from '@prisma/client'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

function ymd(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase() || 'U'
}

function colorFromSeed(seed: string) {
  const palette = ['blue', 'green', 'amber', 'red', 'purple'] as const
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}

function normalizeDepartmentLabel(managerName: string | null) {
  const trimmed = (managerName ?? '').trim()
  if (!trimmed) return 'Unassigned'
  return `${trimmed}'s team`
}

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)

    const { searchParams } = new URL(req.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const departmentFilter = (searchParams.get('department') ?? '').trim() || null

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Missing from/to params', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    const from = parseISO(fromParam)
    const to = parseISO(toParam)
    if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from > to) {
      return NextResponse.json(
        { error: 'Invalid from/to params', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    const currentUser = await prisma.employee.findUnique({
      where: { id: token.userId },
      select: { id: true, managerId: true },
    })
    if (!currentUser) return NextResponse.json([])

    const role = token.role
    const includePending = role === 'MANAGER' || role === 'HR'

    let employeeWhere: Prisma.EmployeeWhereInput = {
      employmentStatus: 'ACTIVE',
      id: { not: token.userId },
    }
    if (role === 'EMPLOYEE') {
      if (!currentUser.managerId) return NextResponse.json([])
      employeeWhere = {
        ...employeeWhere,
        managerId: currentUser.managerId,
      }
    } else if (role === 'MANAGER') {
      const peerClause = currentUser.managerId ? [{ managerId: currentUser.managerId }] : []
      employeeWhere = {
        ...employeeWhere,
        OR: [...peerClause, { managerId: token.userId }],
      }
    } else {
      // HR / ADMIN: all active employees (filter applied later if requested)
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        displayName: true,
        manager: { select: { displayName: true } },
      },
    })

    const employeeIds = employees.map((e) => e.id)
    if (employeeIds.length === 0) return NextResponse.json([])

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: { in: includePending ? ['APPROVED', 'PENDING'] : ['APPROVED'] },
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: {
        employeeId: true,
        startDate: true,
        endDate: true,
        status: true,
        isEmergency: true,
        employee: {
          select: {
            displayName: true,
            jobTitle: true,
            role: true,
            manager: { select: { displayName: true } },
          },
        },
      },
      orderBy: [{ startDate: 'asc' }],
    })

    const out = leaves.map((lr) => {
      const name = lr.employee.displayName
      const designation = lr.employee.jobTitle?.trim() || lr.employee.role
      const department = normalizeDepartmentLabel(lr.employee.manager?.displayName ?? null)

      return {
        employeeId: lr.employeeId,
        name,
        designation,
        avatarInitials: initialsFromName(name),
        avatarColor: colorFromSeed(lr.employeeId),
        leaveType: lr.isEmergency ? ('emergency' as const) : ('annual' as const),
        startDate: ymd(lr.startDate),
        endDate: ymd(lr.endDate),
        status: lr.status === 'PENDING' ? ('pending' as const) : ('approved' as const),
        department,
      }
    })

    const filtered = departmentFilter ? out.filter((r) => (r.department ?? '') === departmentFilter) : out

    return NextResponse.json(filtered)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    console.error('[/api/leaves/team-overview] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
