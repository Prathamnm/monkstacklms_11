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
        workEmail: true,
        displayName: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        phoneNumber: true,
        emergencyName: true,
        emergencyRelation: true,
        emergencyPhone: true,
        profilePictureUrl: true,
        role: true,
        employmentStatus: true,
        managerId: true,
        joinDate: true,
        manager: {
          select: { id: true, displayName: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const balance = await getLeaveBalance(token.userId)

    return NextResponse.json({
      user: {
        ...employee,
        notificationEmail: null,
        email: employee.workEmail, // Backward compatibility for UI
        joinDate: employee.joinDate.toISOString(),
      },
      balance,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (
      message === 'UNAUTHORIZED' ||
      message === 'USER_NOT_SYNCED' ||
      message === 'USER_REMOVED_FROM_TENANT'
    ) {
      return NextResponse.json(
        { error: 'Unauthorized', code: message },
        { status: 401 }
      )
    }
    console.error('[/api/auth/me] Error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
