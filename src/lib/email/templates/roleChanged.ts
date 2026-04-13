export function roleChangedTemplate(data: {
  employeeName: string
  oldRole: string
  newRole: string
  effectiveDate: string
}): { subject: string; body: string } {
  return {
    subject: 'Your Role Has Been Updated — Effective Immediately',
    body: `
<p>Dear ${data.employeeName},</p>
<p>Your role in the Monkstack HR system has been updated:</p>
<p><strong>Previous Role:</strong> ${data.oldRole}<br/>
<strong>New Role:</strong> ${data.newRole}<br/>
<strong>Effective Date:</strong> ${data.effectiveDate}</p>
<p><strong>Action Required:</strong> Please log out of the HR portal and log back in for the changes to take effect. Your dashboard and permissions will update accordingly.</p>
<p>If you believe this change was made in error, please contact the HR Team immediately.</p>
<p>HR Team</p>
    `.trim(),
  }
}
