import { prisma } from '@/lib/db/prisma'

type NotificationType =
  | 'LEAVE_APPLIED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'LEAVE_REVOKED'
  | 'BALANCE_ADJUSTED'
  | 'EMPLOYEE_ONBOARDED'
  | 'EMPLOYEE_OFFBOARDED'
  | 'PROJECT_ASSIGNED'
  | 'PROJECT_REMOVED'
  | 'SYSTEM'

interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  recipientId: string
  senderId?: string
  referenceId?: string
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        recipientId: params.recipientId,
        senderId: params.senderId,
        referenceId: params.referenceId,
      },
    })
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err)
  }
}

export async function createNotifications(params: CreateNotificationParams[]): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: params.map((p) => ({
        type: p.type,
        title: p.title,
        message: p.message,
        recipientId: p.recipientId,
        senderId: p.senderId,
        referenceId: p.referenceId,
      })),
    })
  } catch (err) {
    console.error('[NotificationService] Failed to create notifications:', err)
  }
}

export async function notifyLeaveApplied(
  employeeId: string,
  employeeName: string,
  managerId: string,
  hrIds: string[],
  leaveId: string,
  dates: string
): Promise<void> {
  const recipients = [managerId, ...hrIds]
  await createNotifications(
    recipients.map((recipientId) => ({
      type: 'LEAVE_APPLIED' as NotificationType,
      title: 'New Leave Request',
      message: `${employeeName} has submitted a leave request for ${dates}`,
      recipientId,
      senderId: employeeId,
      referenceId: leaveId,
    }))
  )
}

export async function notifyLeaveApproved(
  employeeId: string,
  approverId: string,
  leaveId: string,
  dates: string
): Promise<void> {
  await createNotification({
    type: 'LEAVE_APPROVED',
    title: 'Leave Request Approved',
    message: `Your leave request for ${dates} has been approved`,
    recipientId: employeeId,
    senderId: approverId,
    referenceId: leaveId,
  })
}

export async function notifyLeaveRejected(
  employeeId: string,
  approverId: string,
  leaveId: string,
  dates: string
): Promise<void> {
  await createNotification({
    type: 'LEAVE_REJECTED',
    title: 'Leave Request Rejected',
    message: `Your leave request for ${dates} has been rejected`,
    recipientId: employeeId,
    senderId: approverId,
    referenceId: leaveId,
  })
}

export async function notifyLeaveRevoked(
  employeeId: string,
  managerId: string,
  revokedById: string,
  leaveId: string,
  dates: string
): Promise<void> {
  await createNotifications([
    {
      type: 'LEAVE_REVOKED',
      title: 'Leave Revoked',
      message: `Your approved leave for ${dates} has been revoked by HR/Admin`,
      recipientId: employeeId,
      senderId: revokedById,
      referenceId: leaveId,
    },
    {
      type: 'LEAVE_REVOKED',
      title: 'Team Leave Revoked',
      message: `An approved leave for ${dates} has been revoked`,
      recipientId: managerId,
      senderId: revokedById,
      referenceId: leaveId,
    },
  ])
}
