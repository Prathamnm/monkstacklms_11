import { NextRequest, NextResponse } from 'next/server'
import { validateToken, requireRole } from '@/lib/auth/validateToken'
import { prisma } from '@/lib/db/prisma'
import { Role } from '@prisma/client'
import { getAppAccessToken, createGraphClient } from '@/lib/auth/graphClient'
import { logAudit } from '@/lib/audit/auditLogger'
import { sendMail } from '@/lib/email/graphMailer'
import { roleChangedTemplate } from '@/lib/email/templates/roleChanged'

import { getAvailabilityForDate } from '@/lib/utils/dateUtils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const { id } = await Promise.resolve(params)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, displayName: true } },
        leaveBalance: true,
        leaveRequests: {
          where: { status: 'APPROVED', startDate: { lte: todayEnd }, endDate: { gte: today } },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const availabilityStatus = getAvailabilityForDate(
      employee.leaveRequests.map((lr) => ({
        startDate: lr.startDate,
        endDate: lr.endDate,
        startHalfDay: lr.startHalfDay,
        endHalfDay: lr.endHalfDay,
        status: lr.status,
      })),
      today
    )

    return NextResponse.json({
      ...employee,
      availabilityStatus,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await validateToken(req)
    requireRole(token, ['HR', 'ADMIN'])

    const body = await req.json()
    const { designation, phoneNumber, emergencyContact, managerId, role, employmentStatus } = body

    const employeeId = params.id
    const prevEmployee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!prevEmployee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        designation,
        phoneNumber,
        emergencyContact,
        managerId: managerId || null,
        role: role as Role,
        employmentStatus,
      },
    })

    if (prevEmployee.role !== role) {
      // Role changed
      await prisma.notification.create({
        data: {
          type: 'ROLE_CHANGED',
          title: 'Your Role Has Changed',
          message: `Your permission role has been changed from ${prevEmployee.role} to ${role}.`,
          recipientId: employeeId,
          senderId: token.userId,
        },
      })
      
      await logAudit('ROLE_CHANGE', token.userId, employeeId, {
        before: { role: prevEmployee.role },
        after: { role },
        params: {},
      }, req)

      // Send email
      const emailObj = roleChangedTemplate({
        employeeName: updatedEmployee.displayName,
        oldRole: prevEmployee.role,
        newRole: role,
        effectiveDate: new Date().toLocaleDateString()
      })
      await sendMail({
        to: [updatedEmployee.email],
        subject: emailObj.subject,
        htmlBody: emailObj.body
      }).catch(console.error)

      // Sync Entra Groups
      try {
        if (updatedEmployee.entraObjectId && !updatedEmployee.entraObjectId.startsWith('pending-')) {
          const appToken = await getAppAccessToken()
          const client = createGraphClient(appToken)
          // Look up Entra groups
          const groups = await client.api('/groups').filter("startsWith(displayName,'LMS_')").get()
          const lmsGroups = groups.value || []
          
          const oldGroupName = `LMS_${prevEmployee.role}`
          const newGroupName = `LMS_${role}`
          const oldGroup = lmsGroups.find((g: any) => g.displayName === oldGroupName)
          const newGroup = lmsGroups.find((g: any) => g.displayName === newGroupName)

          if (oldGroup) {
            await client.api(`/groups/${oldGroup.id}/members/${updatedEmployee.entraObjectId}/$ref`).delete()
          }
          if (newGroup) {
            await client.api(`/groups/${newGroup.id}/members/$ref`).post({
              '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${updatedEmployee.entraObjectId}`
            })
          }
        }
      } catch (err) {
        console.error('Error syncing Entra roles:', err)
      }
    } else {
      await logAudit('EMPLOYEE_UPDATE', token.userId, employeeId, {
        before: {}, after: { designation, phoneNumber }, params: {}
      }, req)
    }

    return NextResponse.json(updatedEmployee)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
