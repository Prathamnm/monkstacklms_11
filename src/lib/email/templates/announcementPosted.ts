export function announcementPostedTemplate(data: {
  title: string
  content: string
  posterName: string
}): { subject: string; body: string } {
  return {
    subject: `Announcement: ${data.title}`,
    body: `
<p>Dear Team,</p>
<p><strong>${data.title}</strong></p>
<p>${data.content}</p>
<p>Posted by: ${data.posterName}</p>
<p>HR Team</p>
    `.trim(),
  }
}
