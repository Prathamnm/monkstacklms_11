import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type Role } from '@prisma/client'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

type ErrorBody = { error: string; code: string; details?: string }

export async function GET(req: NextRequest) {
  try {
    await validateToken(req)

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') ?? '').trim()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const orConditions: Prisma.EmployeeWhereInput[] = []
    if (search) {
      orConditions.push(
        { displayName: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { workEmail: { contains: search, mode: 'insensitive' } }
      )
      const upper = search.toUpperCase()
      if (['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'].includes(upper)) {
        orConditions.push({ role: upper as Role })
      }
    }

    const where: Prisma.EmployeeWhereInput = {
      employmentStatus: { not: 'TERMINATED' },
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        leaveRequests: {
          where: { status: 'APPROVED', startDate: { lte: todayEnd }, endDate: { gte: today } },
        },
      },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json(
      employees.map((emp) => ({
        id: emp.id,
        displayName: emp.displayName,
        email: emp.workEmail,
        workEmail: emp.workEmail,
        role: emp.role,
        jobTitle: emp.jobTitle,
        employmentStatus: emp.employmentStatus,
        profilePictureUrl: emp.profilePictureUrl,
        createdAt: emp.createdAt.toISOString(),
        updatedAt: emp.updatedAt.toISOString(),
        availabilityStatus: getAvailabilityForDate(
          emp.leaveRequests.map((lr) => ({
            startDate: lr.startDate,
            endDate: lr.endDate,
            startHalfDay: lr.startHalfDay,
            endHalfDay: lr.endHalfDay,
            status: lr.status,
          })),
          today
        ),
      }))
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'

    const authJson = (body: ErrorBody, status: number) => NextResponse.json(body, { status })

    if (message === 'UNAUTHORIZED') {
      return authJson({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }
    if (message === 'USER_NOT_SYNCED') {
      return authJson({ error: 'User not synced to directory', code: 'USER_NOT_SYNCED' }, 401)
    }
    if (message === 'USER_REMOVED_FROM_TENANT') {
      return authJson({ error: 'User removed from tenant', code: 'USER_REMOVED_FROM_TENANT' }, 401)
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error('[api/employees] Database initialization failed:', err.message)
      return authJson(
        { error: 'Database is not reachable. Check DATABASE_URL.', code: 'DB_UNAVAILABLE' },
        503
      )
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[api/employees] Prisma error:', err.code, err.message)
      return authJson({ error: 'Directory query failed', code: 'PRISMA_ERROR' }, 500)
    }

    console.error('[api/employees] Unexpected error:', err)
    const details = process.env.NODE_ENV === 'development' ? message : undefined
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', ...(details ? { details } : {}) },
      { status: 500 }
    )
  }
}
