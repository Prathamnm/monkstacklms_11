import { wrapEmailBody, detailRow, detailCard } from './shared'

export function adminOverrideTemplate(data: {
  employeeName: string
  action: 'approved' | 'rejected'
  leaveDates: string
  duration: number
  reason: string
  actorName: string
}): { subject: string; htmlBody: string } {
  const rows = [
    detailRow('Employee', data.employeeName),
    detailRow('Action', data.action.toUpperCase()),
    detailRow('Period', data.leaveDates),
    detailRow('Duration', `${data.duration} day${data.duration !== 1 ? 's' : ''}`),
    detailRow('Override Reason', data.reason),
    detailRow('Override By', data.actorName),
  ].join('\n')

  const htmlBody = wrapEmailBody({
    preheader:  `Leave request ${data.action} via admin override`,
    badgeText:  data.action === 'approved' ? '✅ Override Approved' : '❌ Override Rejected',
    badgeColor: data.action === 'approved' ? 'green' : 'red',
    headline:   `Leave request status updated by Admin`,
    bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                   Your leave request has been actioned via a system override by an administrator.
                 </p>${detailCard(rows)}`,
  })

  return {
    subject: `[System Override] Leave Request ${data.action.toUpperCase()} — ${data.employeeName}`,
    htmlBody,
  }
}
