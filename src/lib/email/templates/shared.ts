// src/lib/email/templates/shared.ts

export interface EmailButton {
  label: string
  url: string
  color?: string  // hex, defaults to indigo
}

/**
 * Wraps email body content in the Monkstack HRM branded shell.
 * All templates must call wrapEmailBody() to ensure visual consistency.
 */
export function wrapEmailBody(params: {
  preheader?: string
  badgeText: string
  badgeColor: string        // 'green' | 'red' | 'amber' | 'blue' | 'indigo'
  headline: string
  bodyHtml: string          // inner content — paragraphs, tables, etc.
  buttons?: EmailButton[]
  footerNote?: string
}): string {
  const { preheader, badgeText, badgeColor, headline, bodyHtml, buttons = [], footerNote } = params

  const BADGE_STYLES: Record<string, string> = {
    green:  'background:#DCFCE7;border:1px solid #86EFAC;color:#16A34A;',
    red:    'background:#FEE2E2;border:1px solid #FCA5A5;color:#DC2626;',
    amber:  'background:#FEF3C7;border:1px solid #FCD34D;color:#D97706;',
    blue:   'background:#DBEAFE;border:1px solid #93C5FD;color:#2563EB;',
    indigo: 'background:#E0E7FF;border:1px solid #A5B4FC;color:#4F46E5;',
  }

  const badgeStyle = BADGE_STYLES[badgeColor] ?? BADGE_STYLES.indigo

  const buttonHtml = buttons.map(btn => {
    const bg = btn.color ?? '#4F46E5'
    return `<a href="${btn.url}" style="display:inline-block;background:${bg};color:#FFFFFF;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin:4px;">${btn.label} →</a>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
      <h1 style="color:#FFFFFF;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Monkstack HRM</h1>
      <p style="color:#94A3B8;margin:6px 0 0;font-size:13px;">Leave Management System</p>
    </div>

    <!-- Body -->
    <div style="background:#FFFFFF;padding:36px 32px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">

      <!-- Badge -->
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;${badgeStyle}border-radius:6px;padding:5px 14px;font-size:13px;font-weight:600;">
          ${badgeText}
        </span>
      </div>

      <!-- Headline -->
      <h2 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 20px;line-height:1.3;">
        ${headline}
      </h2>

      <!-- Inner content -->
      ${bodyHtml}

      <!-- Buttons -->
      ${buttons.length > 0 ? `<div style="margin-top:28px;text-align:center;">${buttonHtml}</div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;">
      <p style="color:#94A3B8;font-size:12px;margin:0;">
        ${footerNote ?? 'This is an automated notification from Monkstack HRM. Do not reply to this email.'}
      </p>
    </div>

  </div>
</body>
</html>`
}

/**
 * Build a details table row — used inside bodyHtml for leave details.
 */
export function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="color:#64748B;font-size:13px;font-weight:500;padding:7px 0;width:38%;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;">${label}</td>
    <td style="color:#0F172A;font-size:14px;font-weight:600;padding:7px 0;">${value}</td>
  </tr>`
}

/**
 * Wraps detail rows in a card container.
 */
export function detailCard(rows: string): string {
  return `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`
}
