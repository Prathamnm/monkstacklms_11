interface LeaveRejectedEmailData {
  employeeName: string
  approverName: string
  startDate: string
  endDate: string
  totalDays: number
  rejectionReason: string
  appUrl: string
}

export function leaveRejectedTemplate(data: LeaveRejectedEmailData): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
      <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:700;">Monkstack HRM</h1>
      <p style="color:#94A3B8;margin:8px 0 0;font-size:14px;">Leave Management System</p>
    </div>
    <div style="background:#FFFFFF;padding:40px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
      <div style="display:inline-block;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:6px;padding:6px 14px;margin-bottom:24px;">
        <span style="color:#DC2626;font-size:13px;font-weight:600;">❌ Leave Rejected</span>
      </div>
      <h2 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 16px;">
        Your leave request has been rejected
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hi ${data.employeeName}, unfortunately your leave request has been rejected by ${data.approverName}.
      </p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;width:40%;text-transform:uppercase;letter-spacing:0.05em;">Leave Period</td>
            <td style="color:#0F172A;font-size:14px;padding:8px 0;">${data.startDate} – ${data.endDate}</td>
          </tr>
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;text-transform:uppercase;letter-spacing:0.05em;">Duration</td>
            <td style="color:#0F172A;font-size:14px;padding:8px 0;">${data.totalDays} day${data.totalDays !== 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td style="color:#64748B;font-size:13px;font-weight:500;padding:8px 0;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">Reason for Rejection</td>
            <td style="color:#DC2626;font-size:14px;padding:8px 0;">${data.rejectionReason}</td>
          </tr>
        </table>
      </div>
      <p style="color:#64748B;font-size:14px;line-height:1.6;">
        If you have questions, please discuss with your manager directly.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${data.appUrl}/employee/apply-leave" 
           style="display:inline-block;background:#0F172A;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
          Apply for Different Dates →
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
