import { wrapEmailBody, detailRow, detailCard } from './shared'

export function roleChangedTemplate(data: {
  employeeName: string
  oldRole: string
  newRole: string
  effectiveDate: string
}): { subject: string; htmlBody: string } {
  const rows = [
    detailRow('Previous Role', data.oldRole),
    detailRow('New Role',      data.newRole),
    detailRow('Effective',     data.effectiveDate),
  ].join('\n')

  const htmlBody = wrapEmailBody({
    preheader:  'Your role in Monkstack HRM has been updated',
    badgeText:  '🔄 Role Updated',
    badgeColor: 'blue',
    headline:   'Your access role has been updated',
    bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                   Hi ${data.employeeName}, your role in the Monkstack HRM system has been changed. 
                   Please log out and log back in for the new permissions to take effect.
                 </p>${detailCard(rows)}`,
  })

  return {
    subject: `[Monkstack HRM] Your role has been updated to ${data.newRole}`,
    htmlBody,
  }
}
