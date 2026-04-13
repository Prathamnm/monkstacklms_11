import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { getLeaveBalance } from '@/lib/leave/balanceService'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)

    const employee = await prisma.employee.findUnique({
      where: { id: token.userId },
      select: {
        id: true,
        entraObjectId: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        designation: true,

        phoneNumber: true,
        emergencyContact: true,
        profilePictureUrl: true,
        role: true,
        employmentStatus: true,
        managerId: true,
        joinDate: true,
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const balance = await getLeaveBalance(token.userId)

    return NextResponse.json({
      user: {
        ...employee,
        joinDate: employee.joinDate.toISOString(),
      },
      balance,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'UNAUTHORIZED' || message === 'USER_NOT_SYNCED') {
      return NextResponse.json(
        { error: 'Unauthorized', code: message },
        { status: 401 }
      )
    }
    console.error('[/api/auth/me] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
