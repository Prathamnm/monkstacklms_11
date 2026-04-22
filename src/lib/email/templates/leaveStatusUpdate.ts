import { wrapEmailBody, detailRow, detailCard } from './shared'

export interface LeaveStatusUpdateParams {
  employeeName: string
  startDate: Date | string
  endDate: Date | string
  totalDays: number
  status: 'APPROVED' | 'REJECTED' | 'REVOKED'
  reason?: string | null
  approverComment?: string | null
  appBaseUrl: string
  leaveId: string
  recipientRole?: 'EMPLOYEE' | 'MANAGER'  // for correct deep-link
}

export function buildLeaveStatusUpdateEmail(
  params: LeaveStatusUpdateParams
): { subject: string; htmlBody: string } {
  const {
    employeeName, startDate, endDate, totalDays,
    status, reason, approverComment, appBaseUrl, recipientRole,
  } = params

  const fmt = (d: Date | string) =>
    (typeof d === 'string' ? new Date(d) : d)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const startStr = fmt(startDate)
  const endStr   = fmt(endDate)

  const isEmployee = !recipientRole || recipientRole === 'EMPLOYEE'
  const myLeavesUrl = isEmployee
    ? `${appBaseUrl}/employee/my-leaves`
    : `${appBaseUrl}/manager/my-leaves`

  const CONFIG = {
    APPROVED: {
      badge: '✅ Leave Approved',
      badgeColor: 'green' as const,
      headline: 'Your leave has been approved!',
      intro: `Great news, ${employeeName}! Your leave request has been approved.`,
    },
    REJECTED: {
      badge: '❌ Leave Rejected',
      badgeColor: 'red' as const,
      headline: 'Your leave request was not approved',
      intro: `Hi ${employeeName}, your leave request has been rejected. See the reason below.`,
    },
    REVOKED: {
      badge: '⚠️ Leave Revoked',
      badgeColor: 'amber' as const,
      headline: 'Your approved leave has been revoked',
      intro: `Hi ${employeeName}, your previously approved leave has been revoked. Your leave balance has been restored.`,
    },
  }

  const cfg = CONFIG[status]
  const subject = `[Monkstack HRM] ${cfg.badge.replace(/[✅❌⚠️] /, '')}: ${startStr} – ${endStr}`

  const commentRow = approverComment
    ? detailRow(status === 'REJECTED' ? 'Rejection Reason' : 'Note', approverComment)
    : ''

  const rows = [
    detailRow('Period',    `${startStr} – ${endStr}`),
    detailRow('Duration',  `${totalDays} day${totalDays !== 1 ? 's' : ''}`),
    reason ? detailRow('Your Reason', reason) : '',
    commentRow,
  ].filter(Boolean).join('\n')

  const htmlBody = wrapEmailBody({
    preheader: cfg.intro,
    badgeText:  cfg.badge,
    badgeColor: cfg.badgeColor,
    headline:   cfg.headline,
    bodyHtml: `
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">${cfg.intro}</p>
      ${detailCard(rows)}
    `,
    buttons: [{ label: 'View My Leaves', url: myLeavesUrl }],
  })

  return { subject, htmlBody }
}
