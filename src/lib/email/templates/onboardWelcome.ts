export function onboardWelcomeTemplate(data: {
  employeeName: string
  orgName: string
  joinDate: string
  managerName: string
  standardLeaves: number
}): { subject: string; body: string } {
  return {
    subject: `Welcome to ${data.orgName} — Your account is ready`,
    body: `
<p>Dear ${data.employeeName},</p>
<p>Welcome to <strong>${data.orgName}</strong>! We're thrilled to have you on board.</p>
<p><strong>Join Date:</strong> ${data.joinDate}<br/>
<strong>Reporting Manager:</strong> ${data.managerName}</p>
<p><strong>Your Leave Balance:</strong><br/>
Standard Leave: ${data.standardLeaves} days<br/>
Emergency Leave: 2 days</p>
<p>Please log in using your company Microsoft account to access the HR portal.</p>
<p>Best regards,<br/>HR Team — ${data.orgName}</p>
    `.trim(),
  }
}
