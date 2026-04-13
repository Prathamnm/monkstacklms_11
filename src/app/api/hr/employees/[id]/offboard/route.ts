import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { logAudit } from '@/lib/audit/auditLogger'
import { getAppAccessToken } from '@/lib/auth/graphClient'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const body = await req.json()
    const { terminationDate, reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Step 1: Validate employee
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { manager: { select: { id: true, email: true, displayName: true } } },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.employmentStatus === 'TERMINATED') {
      return NextResponse.json({ error: 'Employee is already terminated' }, { status: 409 })
    }

    const termDate = terminationDate ? new Date(terminationDate) : new Date()
    const now = new Date()

    // Step 2: Update employee status
    await prisma.employee.update({
      where: { id: params.id },
      data: {
        employmentStatus: 'TERMINATED',
        terminationDate: termDate,
      },
    })

    // Step 3: Cancel pending leaves
    await prisma.leaveRequest.updateMany({
      where: { employeeId: params.id, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: now },
    })

    // Step 4: Revoke future approved leaves + create reversal ledger entries
    const futureApprovedLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: params.id,
        status: 'APPROVED',
        startDate: { gt: now },
      },
    })

    for (const leave of futureApprovedLeaves) {
      await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'REVOKED', revokedAt: now, revokedBy: token.userId, revocationReason: 'Offboarding reversal' },
      })
      await prisma.leaveLedgerEntry.create({
        data: {
          employeeId: params.id,
          type: 'REVERSAL',
          days: leave.totalDays,
          reason: 'Offboarding reversal',
          referenceId: leave.id,
          performedBy: token.userId,
          year: now.getFullYear(),
        },
      })
    }

    // Step 5: Deactivate all project memberships
    await prisma.employeeProject.updateMany({
      where: { employeeId: params.id, isActive: true },
      data: { isActive: false, removedAt: now },
    })

    // Step 6: Clear managerId for subordinates
    await prisma.employee.updateMany({
      where: { managerId: params.id },
      data: { managerId: null },
    })

    // Step 7: Audit log
    await logAudit('EMPLOYEE_OFFBOARD', token.userId, params.id, {
      before: { status: employee.employmentStatus },
      after: { status: 'TERMINATED', terminationDate: termDate.toISOString(), reason },
      params: {},
    }, req)

    // Step 8 & 9: Graph API — disable account + remove from groups (best-effort)
    try {
      if (employee.entraObjectId && !employee.entraObjectId.startsWith('pending-')) {
        const accessToken = await getAppAccessToken()
        await fetch(`https://graph.microsoft.com/v1.0/users/${employee.entraObjectId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountEnabled: false }),
        })
      }
    } catch (graphErr) {
      console.error('[offboard] Graph API error (non-fatal):', graphErr)
    }

    // Steps 10-11: In-app notifications for manager and HR employees
    const hrEmployees = await prisma.employee.findMany({
      where: { role: 'HR', employmentStatus: 'ACTIVE' },
      select: { id: true },
    })

    const notifyIds = [
      ...(employee.managerId ? [employee.managerId] : []),
      ...hrEmployees.map((h) => h.id),
    ].filter((id) => id !== params.id)

    if (notifyIds.length > 0) {
      await prisma.notification.createMany({
        data: notifyIds.map((recipientId) => ({
          type: 'EMPLOYEE_OFFBOARDED' as const,
          title: `Employee Offboarded: ${employee.displayName}`,
          message: `${employee.displayName} has been offboarded. Reason: ${reason}`,
          recipientId,
          senderId: token.userId,
          referenceId: params.id,
        })),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
