import { wrapEmailBody, detailRow, detailCard } from './shared'

export interface ManagerOnLeaveParams {
  managerName: string
  jobTitle: string | null
  startDate: string
  endDate: string
  totalDays: number
  appBaseUrl: string
}

export function buildManagerOnLeaveEmail(
  params: ManagerOnLeaveParams
): { subject: string; htmlBody: string } {
  const { managerName, jobTitle, startDate, endDate, totalDays, appBaseUrl } = params

  const subject = `📢 ${managerName} is on leave — ${startDate} to ${endDate}`

  const rows = [
    detailRow('Manager',    managerName),
    jobTitle ? detailRow('Title', jobTitle) : '',
    detailRow('Leave Period', `${startDate} – ${endDate}`),
    detailRow('Duration',    `${totalDays} day${totalDays !== 1 ? 's' : ''}`),
  ].filter(Boolean).join('\n')

  const htmlBody = wrapEmailBody({
    preheader: `Your manager ${managerName} will be on leave from ${startDate} to ${endDate}`,
    badgeText:  '📢 Manager Leave Notice',
    badgeColor: 'amber',
    headline:   `Your manager ${managerName} will be on leave`,
    bodyHtml: `
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        This is to inform you that <strong>${managerName}</strong> will be on leave for the dates below.
        For urgent matters during this period, please contact HR.
      </p>
      ${detailCard(rows)}
    `,
    buttons: [{ label: 'View My Dashboard', url: `${appBaseUrl}/employee/dashboard`, color: '#4F46E5' }],
  })

  return { subject, htmlBody }
}
