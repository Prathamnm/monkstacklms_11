import { wrapEmailBody } from './shared'

export function announcementPostedTemplate(data: {
  title: string
  content: string
  posterName: string
}): { subject: string; htmlBody: string } {
  const htmlBody = wrapEmailBody({
    preheader:  `New Announcement: ${data.title}`,
    badgeText:  '📢 New Announcement',
    badgeColor: 'indigo',
    headline:   data.title,
    bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                   ${data.content}
                 </p>`,
    footerNote: `Posted by ${data.posterName} • Monkstack HRM Announcement`,
  })

  return {
    subject: `[Announcement] ${data.title}`,
    htmlBody,
  }
}
