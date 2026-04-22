import { wrapEmailBody, detailRow, detailCard } from './shared'

interface LeaveCancelledEmailData {
  employeeName: string
  startDate: string
  endDate: string
  totalDays: number
  appUrl: string
}

export function leaveCancelledTemplate(data: LeaveCancelledEmailData): { subject: string; htmlBody: string } {
  const rows = [
    detailRow('Employee', data.employeeName),
    detailRow('Cancelled Period', `${data.startDate} – ${data.endDate}`),
    detailRow('Duration', `${data.totalDays} day${data.totalDays !== 1 ? 's' : ''}`),
  ].join('\n')

  const htmlBody = wrapEmailBody({
    preheader:  `${data.employeeName} has cancelled their leave request`,
    badgeText:  '🚫 Leave Cancelled',
    badgeColor: 'indigo',
    headline:   `${data.employeeName} cancelled their leave request`,
    bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                   The leave request below has been cancelled by the employee. No action is required.
                 </p>${detailCard(rows)}`,
  })

  return {
    subject: `Leave Cancelled: ${data.employeeName} (${data.startDate} – ${data.endDate})`,
    htmlBody,
  }
}
