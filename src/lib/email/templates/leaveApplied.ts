import { wrapEmailBody, detailRow, detailCard } from './shared'

export interface LeaveAppliedEmailParams {
  employeeName: string
  employeeEmail: string
  jobTitle: string | null
  startDate: string          // formatted e.g. "15 Jan 2025"
  endDate: string
  totalDays: number
  reason: string
  isEmergency: boolean
  leaveId: string
  appBaseUrl: string
  recipientRole: 'MANAGER' | 'HR' | 'ADMIN'
}

export function buildLeaveAppliedEmail(params: LeaveAppliedEmailParams): { subject: string; htmlBody: string } {
  const {
    employeeName, employeeEmail, jobTitle, startDate, endDate,
    totalDays, reason, isEmergency, appBaseUrl, recipientRole,
  } = params

  const isManager = recipientRole === 'MANAGER'
  const actionUrl  = isManager ? `${appBaseUrl}/manager/approvals` : `${appBaseUrl}/hr/leaves`
  const actionLabel = isManager ? 'Review & Take Action' : 'View Leave Request'
  const actionColor = isManager ? '#16A34A' : '#4F46E5'

  const subject = `${isEmergency ? '🚨 Emergency — ' : ''}Leave Request: ${employeeName} (${startDate} – ${endDate})`

  const rows = [
    detailRow('Employee',  employeeName),
    detailRow('Email',     `<a href="mailto:${employeeEmail}" style="color:#4F46E5;">${employeeEmail}</a>`),
    jobTitle ? detailRow('Job Title', jobTitle) : '',
    detailRow('Dates',     `${startDate} – ${endDate}`),
    detailRow('Duration',  `${totalDays} day${totalDays !== 1 ? 's' : ''}`),
    detailRow('Type',      isEmergency
      ? '<span style="color:#DC2626;font-weight:700;">Emergency Leave</span>'
      : 'Standard Leave'),
    detailRow('Reason',    reason || 'No reason provided'),
  ].filter(Boolean).join('\n')

  const actionNote = isManager
    ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        This leave request is pending your approval. Please review the details and approve or reject it from the app.
       </p>`
    : `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        This leave request has been submitted and is awaiting manager approval. You can view it in HR Leaves.
       </p>`

  const htmlBody = wrapEmailBody({
    preheader: `${employeeName} has applied for leave from ${startDate} to ${endDate}`,
    badgeText:  isEmergency ? '🚨 Emergency Leave Request' : '📋 New Leave Request',
    badgeColor: isEmergency ? 'red' : 'indigo',
    headline:   `${employeeName} has applied for leave`,
    bodyHtml:   actionNote + detailCard(rows),
    buttons: [{ label: actionLabel, url: actionUrl, color: actionColor }],
  })

  return { subject, htmlBody }
}
