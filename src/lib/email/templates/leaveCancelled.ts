interface LeaveCancelledEmailData {
  employeeName: string
  startDate: string
  endDate: string
  totalDays: number
  appUrl: string
}

export function leaveCancelledTemplate(data: LeaveCancelledEmailData): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
      <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:700;">Monkstack HRM</h1>
    </div>
    <div style="background:#FFFFFF;padding:40px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
      <div style="display:inline-block;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:6px;padding:6px 14px;margin-bottom:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">🚫 Leave Cancelled</span>
      </div>
      <h2 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 16px;">
        ${data.employeeName} has cancelled their leave request
      </h2>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;width:40%;text-transform:uppercase;letter-spacing:0.05em;">Employee</td>
            <td style="color:#0F172A;font-size:14px;padding:8px 0;">${data.employeeName}</td>
          </tr>
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;text-transform:uppercase;letter-spacing:0.05em;">Cancelled Period</td>
            <td style="color:#0F172A;font-size:14px;padding:8px 0;">${data.startDate} – ${data.endDate}</td>
          </tr>
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;text-transform:uppercase;letter-spacing:0.05em;">Duration</td>
            <td style="color:#0F172A;font-size:14px;padding:8px 0;">${data.totalDays} day${data.totalDays !== 1 ? 's' : ''}</td>
          </tr>
        </table>
      </div>
      <p style="color:#64748B;font-size:14px;">No further action is required from your side.</p>
    </div>
    <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;padding:20px;text-align:center;">
      <p style="color:#94A3B8;font-size:12px;margin:0;">This is an automated email from Monkstack HRM. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
