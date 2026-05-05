import { wrapEmailBody, detailRow, detailCard } from './shared'

export function holidayCreatedTemplate(data: {
  holidayName: string
  date: string
  type: 'PUBLIC' | 'FLOATER'
  notes?: string | null
}): { subject: string; htmlBody: string } {
  const rows = [
    detailRow('Holiday', data.holidayName),
    detailRow('Date', data.date),
    detailRow('Type', data.type === 'PUBLIC' ? 'Public Holiday' : 'Floater Holiday'),
  ]

  if (data.notes) {
    rows.push(detailRow('Notes', data.notes))
  }

  const htmlBody = wrapEmailBody({
    preheader:  `New Holiday: ${data.holidayName} on ${data.date}`,
    badgeText:  '🎉 New Holiday Added',
    badgeColor: data.type === 'PUBLIC' ? 'green' : 'amber',
    headline:   `New Holiday: ${data.holidayName}`,
    bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                   ${data.type === 'FLOATER' 
                     ? 'A new floater holiday has been added. You may choose to avail it on an alternate approved date if applicable.' 
                     : 'A new public holiday has been added. Offices will be closed on this day.'}
                 </p>${detailCard(rows.join('\n'))}`,
  })

  return {
    subject: `[Holiday] ${data.holidayName} — ${data.date}`,
    htmlBody,
  }
}
