import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { AuditAction } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    const { id } = params
    const { status, rejectionReason } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['REVOKED', 'CANCELLED'],
      REJECTED: [],
      CANCELLED: [],
      REVOKED: []
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
    })

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const allowed = validTransitions[request.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${request.status} to ${status}`
      }, { status: 400 })
    }

    // Permission check
    if (status === 'CANCELLED') {
      if (request.employeeId !== token.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (['APPROVED', 'REJECTED', 'REVOKED'].includes(status)) {
      if (!['MANAGER', 'HR'].includes(token.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Manager check
      if (token.role === 'MANAGER' && request.managerId !== token.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updateData: any = { status }
    if (status === 'APPROVED') {
      updateData.approvedAt = new Date()
      updateData.approverId = token.userId
    } else if (status === 'REJECTED') {
      updateData.rejectedAt = new Date()
      updateData.approverId = token.userId
      updateData.rejectionReason = rejectionReason || null
    } else if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date()
    } else if (status === 'REVOKED') {
      updateData.revokedAt = new Date()
      updateData.revokedBy = token.userId
      updateData.revocationReason = rejectionReason || null
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
    })

    // Write audit log
    const auditActionMap: Record<string, string> = {
      APPROVED: 'LEAVE_APPROVE',
      REJECTED: 'LEAVE_REJECT',
      CANCELLED: 'LEAVE_CANCEL',
      REVOKED: 'LEAVE_REVOKE'
    }

    await prisma.auditLog.create({
      data: {
        action: (auditActionMap[status] || 'LEAVE_APPROVE') as AuditAction,
        performedBy: token.userId,
        targetId: request.employeeId,
        details: { requestId: id, oldStatus: request.status, newStatus: status },
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
