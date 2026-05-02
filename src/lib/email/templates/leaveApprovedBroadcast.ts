import { wrapEmailBody, detailRow, detailCard } from './shared'

export interface LeaveApprovedBroadcastParams {
  employeeName: string
  jobTitle: string | null
  startDate: string
  endDate: string
  totalDays: number
  approverName: string
  appBaseUrl: string
  recipientRole: 'EMPLOYEE' | 'HR' | 'ADMIN' | 'MANAGER'
}

export function buildLeaveApprovedBroadcastEmail(
  params: LeaveApprovedBroadcastParams
): { subject: string; htmlBody: string } {
  const { employeeName, jobTitle, startDate, endDate, totalDays, approverName, appBaseUrl, recipientRole } = params

  const subject = `🏖️ ${employeeName} is on leave — ${startDate} to ${endDate}`

  const rows = [
    detailRow('Team Member', employeeName),
    jobTitle ? detailRow('Role / Title', jobTitle) : '',
    detailRow('Leave Period', `${startDate} – ${endDate}`),
    detailRow('Duration',    `${totalDays} day${totalDays !== 1 ? 's' : ''}`),
    detailRow('Approved By', approverName),
  ].filter(Boolean).join('\n')

  const viewUrl = recipientRole === 'HR' || recipientRole === 'ADMIN'
    ? `${appBaseUrl}/hr/leaves`
    : `${appBaseUrl}/employee/my-team`

  const htmlBody = wrapEmailBody({
    preheader: `${employeeName} will be on leave from ${startDate} to ${endDate}`,
    badgeText:  '✅ Leave Approved',
    badgeColor: 'green',
    headline:   `${employeeName} will be on leave`,
    bodyHtml: `
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        This is to inform you that <strong>${employeeName}</strong>${jobTitle ? ` (${jobTitle})` : ''}
        has an approved leave for the dates below. Please plan accordingly.
      </p>
      ${detailCard(rows)}
    `,
    buttons: [{ label: 'View Team Schedule', url: viewUrl, color: '#4F46E5' }],
  })

  return { subject, htmlBody }
}
