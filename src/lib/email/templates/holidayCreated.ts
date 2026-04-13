export function holidayCreatedTemplate(data: {
  holidayName: string
  date: string
  type: 'PUBLIC' | 'FLOATER'
  notes?: string | null
}): { subject: string; body: string } {
  return {
    subject: `New Holiday: ${data.holidayName} on ${data.date}`,
    body: `
<p>Dear Team,</p>
<p>A new holiday has been added to the calendar:</p>
<p><strong>Holiday:</strong> ${data.holidayName}<br/>
<strong>Date:</strong> ${data.date}<br/>
<strong>Type:</strong> ${data.type === 'PUBLIC' ? 'Public Holiday' : 'Floater Holiday'}${data.notes ? `<br/><strong>Notes:</strong> ${data.notes}` : ''}</p>
<p>${data.type === 'FLOATER' ? 'This is a floater holiday — you may choose to avail it on an alternate approved date.' : 'This is a public holiday. Offices will be closed on this day.'}</p>
<p>HR Team</p>
    `.trim(),
  }
}
