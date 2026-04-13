import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import type { Role } from '@prisma/client'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

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
        { designation: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      )
      const upper = search.toUpperCase()
      if (['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'].includes(upper)) {
        orConditions.push({ role: upper as Role })
      }
    }

    const where: Prisma.EmployeeWhereInput = {
      employmentStatus: 'ACTIVE',
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
        email: emp.email,
        role: emp.role,
        designation: emp.designation,
        jobTitle: emp.jobTitle,
        employmentStatus: emp.employmentStatus,
        profilePictureUrl: emp.profilePictureUrl,
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
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
