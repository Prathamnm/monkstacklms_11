interface HrActionEmailData {
  employeeName: string
  action: 'ONBOARDED' | 'OFFBOARDED' | 'BALANCE_ADJUSTED' | 'LEAVE_REVOKED'
  details: Record<string, string>
  appUrl: string
}

export function hrActionTemplate(data: HrActionEmailData): string {
  const actionConfig = {
    ONBOARDED: { label: 'Welcome to Monkstack HRM', color: '#16A34A', bg: '#DCFCE7', border: '#86EFAC', emoji: '👋' },
    OFFBOARDED: { label: 'Offboarding Notification', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', emoji: '🔔' },
    BALANCE_ADJUSTED: { label: 'Leave Balance Updated', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', emoji: '📊' },
    LEAVE_REVOKED: { label: 'Leave Revoked', color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD', emoji: '⚠️' },
  }

  const config = actionConfig[data.action]

  const detailsRows = Object.entries(data.details)
    .map(
      ([key, value]) => `
      <tr>
        <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;width:40%;text-transform:uppercase;letter-spacing:0.05em;">${key}</td>
        <td style="color:#0F172A;font-size:14px;padding:8px 0;">${value}</td>
      </tr>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
      <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:700;">Monkstack HRM</h1>
    </div>
    <div style="background:#FFFFFF;padding:40px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
      <div style="display:inline-block;background:${config.bg};border:1px solid ${config.border};border-radius:6px;padding:6px 14px;margin-bottom:24px;">
        <span style="color:${config.color};font-size:13px;font-weight:600;">${config.emoji} ${config.label}</span>
      </div>
      <h2 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 16px;">${config.label}</h2>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;width:40%;text-transform:uppercase;letter-spacing:0.05em;">Employee</td>
            <td style="color:#0F172A;font-size:14px;font-weight:600;padding:8px 0;">${data.employeeName}</td>
          </tr>
          ${detailsRows}
        </table>
      </div>
      <div style="text-align:center;">
        <a href="${data.appUrl}" 
           style="display:inline-block;background:#0F172A;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
          Open Monkstack HRM →
        </a>
      </div>
    </div>
    <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;padding:20px;text-align:center;">
      <p style="color:#94A3B8;font-size:12px;margin:0;">This is an automated email from Monkstack HRM. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
