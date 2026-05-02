import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const url = new URL(req.url)
    const userIdParam = url.searchParams.get('userId')

    let targetUserId = token.userId

    // Allow HR/Admin/Manager to view other users' requests
    if (userIdParam && userIdParam !== token.userId) {
      if (!['HR', 'ADMIN', 'MANAGER'].includes(token.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      if (token.role === 'MANAGER') {
        // Managers can only view their direct reports' requests
        const employee = await prisma.employee.findUnique({
          where: { id: userIdParam },
          select: { managerId: true },
        })
        if (!employee || employee.managerId !== token.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      
      targetUserId = userIdParam
    }

    const status = url.searchParams.get('status')

    const whereClause: any = { employeeId: targetUserId }
    if (status && status !== 'ALL') {
      whereClause.status = status
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        approver: {
          select: { id: true, displayName: true, workEmail: true },
        },
        employee: {
          select: { id: true, displayName: true, workEmail: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = leaves.map((l) => ({
      ...l,
      approver: l.approver ? { ...l.approver, email: (l.approver as any).workEmail } : null,
      employee: l.employee ? { ...l.employee, email: (l.employee as any).workEmail } : null,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      approvedAt: l.approvedAt?.toISOString() ?? null,
      rejectedAt: l.rejectedAt?.toISOString() ?? null,
      revokedAt: l.revokedAt?.toISOString() ?? null,
      cancelledAt: l.cancelledAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }))

    return NextResponse.json({ data, total: data.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await validateToken(req)
    const body = await req.json()
    const { id, status, rejectionReason } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Check permissions
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { managerId: true } },
      },
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Only approvers can approve/reject
    if (['APPROVED', 'REJECTED'].includes(status)) {
      if (!['HR', 'ADMIN', 'MANAGER'].includes(token.role)) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
      }
      
      if (token.role === 'MANAGER' && leave.employee?.managerId !== token.userId) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
      }
    }

    // Only employee can cancel their own request
    if (status === 'CANCELLED' && leave.employeeId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Update the leave request
    const updateData: any = {
      status,
      approverId: ['APPROVED', 'REJECTED'].includes(status) ? token.userId : leave.approverId,
    }

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date()
    } else if (status === 'REJECTED') {
      updateData.rejectedAt = new Date()
      updateData.rejectionReason = rejectionReason || null
    } else if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date()
    } else if (status === 'REVOKED') {
      updateData.revokedAt = new Date()
      updateData.revokedBy = token.userId
      updateData.revocationReason = rejectionReason || null
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: {
        approver: {
          select: { id: true, displayName: true, workEmail: true },
        },
        employee: {
          select: { id: true, displayName: true, workEmail: true },
        },
      },
    })

    return NextResponse.json({
      ...updatedLeave,
      approver: updatedLeave.approver ? { ...updatedLeave.approver, email: (updatedLeave.approver as any).workEmail } : null,
      employee: updatedLeave.employee ? { ...updatedLeave.employee, email: (updatedLeave.employee as any).workEmail } : null,
      startDate: updatedLeave.startDate.toISOString(),
      endDate: updatedLeave.endDate.toISOString(),
      approvedAt: updatedLeave.approvedAt?.toISOString() ?? null,
      rejectedAt: updatedLeave.rejectedAt?.toISOString() ?? null,
      revokedAt: updatedLeave.revokedAt?.toISOString() ?? null,
      cancelledAt: updatedLeave.cancelledAt?.toISOString() ?? null,
      createdAt: updatedLeave.createdAt.toISOString(),
      updatedAt: updatedLeave.updatedAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
