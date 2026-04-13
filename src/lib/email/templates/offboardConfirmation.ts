export function offboardConfirmationTemplate(data: {
  employeeName: string
  terminationDate: string
  reason: string
}): { subject: string; body: string } {
  return {
    subject: 'Employment Update — Account Deactivated',
    body: `
<p>Dear ${data.employeeName},</p>
<p>This email confirms that your employment has been concluded as of <strong>${data.terminationDate}</strong>.</p>
<p><strong>Reason:</strong> ${data.reason}</p>
<p>Your system access has been revoked. Please return all company assets and reach out to HR for any clearance-related queries.</p>
<p>We wish you all the best in your future endeavours.</p>
<p>HR Team</p>
    `.trim(),
  }
}
