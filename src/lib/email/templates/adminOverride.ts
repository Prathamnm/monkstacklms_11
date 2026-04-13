export function adminOverrideTemplate(data: {
  employeeName: string
  action: 'approved' | 'rejected'
  leaveDates: string
  duration: number
  reason: string
  actorName: string
}): { subject: string; body: string } {
  return {
    subject: `[System Override] Leave Request ${data.action} — ${data.employeeName}`,
    body: `
<p>Dear ${data.employeeName},</p>
<p>Your leave request has been <strong>${data.action}</strong> via admin override.</p>
<p><strong>Leave Dates:</strong> ${data.leaveDates}<br/>
<strong>Duration:</strong> ${data.duration} day(s)<br/>
<strong>Reason for Override:</strong> ${data.reason}<br/>
<strong>Actioned by:</strong> ${data.actorName}</p>
<p>If you have any questions, please contact your HR representative.</p>
<p>HR System</p>
    `.trim(),
  }
}
