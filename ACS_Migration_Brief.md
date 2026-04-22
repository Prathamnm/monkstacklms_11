# Moonshine LMS — ACS Email Migration Brief

---

## 1. HOW YOUR CURRENT EMAIL SYSTEM WORKS

Your app uses **Microsoft Graph API** to send emails. Here is the exact chain:

```
Route Handler (e.g. /api/leave/apply)
  → calls sendMail() from graphMailer.ts
      → calls getAppAccessToken() from graphClient.ts
          → fetches a bearer token from Azure Entra ID using client_credentials
      → POSTs to https://graph.microsoft.com/v1.0/users/{GRAPH_SENDER_EMAIL}/sendMail
          → Outlook/Exchange sends the email on behalf of that mailbox
```

The key env var is `GRAPH_SENDER_EMAIL` (e.g. `no-reply@moonshine.onmicrosoft.com`). If it is missing or is the placeholder value, `graphMailer.ts` already short-circuits and logs a warning — emails are silently skipped. **This is the guard you rely on.**

### Every place emails are fired today

| Route file | Trigger | Email(s) sent |
|---|---|---|
| `src/app/api/leave/apply/route.ts` | Employee submits leave | → Manager (leave applied) + all HR/Admin (leave applied) |
| `src/app/api/manager/approvals/[id]/route.ts` | Manager approves | → Employee (status update) + broadcast to whole team + HR/Admin |
| `src/app/api/manager/approvals/[id]/route.ts` | Manager rejects | → Employee (status update) |
| `src/app/api/hr/leaves/[id]/revoke/route.ts` | HR revokes a leave | → Employee (status update) + CC to other HR/Admin |
| `src/app/api/admin/leaves/[id]/override/route.ts` | Admin overrides leave | ⚠️ **NO EMAIL SENT** — only in-app notification (bug — see Section 4) |
| `src/app/api/announcements/route.ts` | Announcement posted | ⚠️ **NO EMAIL SENT** — only in-app notification (currently intentional but inconsistent) |
| Admin users role-change flow | Role changed | Template exists (`roleChanged.ts`) but **sendMail is never called** (bug) |
| Holiday created | Holiday added | Template exists (`holidayCreated.ts`) but **sendMail is never called** (bug) |

### Templates that exist but are NEVER wired to sendMail

- `adminOverride.ts` — plain HTML template, unused
- `announcementPosted.ts` — plain text template, unused
- `holidayCreated.ts` — plain text template, unused
- `roleChanged.ts` — plain text template, unused
- `leaveCancelled.ts` — full HTML template, unused (cancel route exists but does not call sendMail)
- `hrAction.ts` — full HTML template, unused

### The Outlook links (do NOT touch these)

These are the `mailto:` links and the "Open in Outlook" action buttons that appear on the **frontend UI pages** — they are separate from the backend `sendMail()` calls entirely. You have confirmed you want these left alone. The ACS migration only touches `graphMailer.ts` and the routes above.

---

## 2. WHAT IS AZURE COMMUNICATION SERVICES (ACS)?

### The short version

ACS Email is Microsoft's **dedicated transactional email service** — think SendGrid, but inside Azure. Instead of routing email through someone's Outlook mailbox (Graph), you send via a provisioned email domain that ACS manages.

### How it works technically

```
Your Next.js route
  → calls acsMailer.ts (new file, replaces graphMailer.ts)
      → creates EmailClient using ACS_CONNECTION_STRING
      → calls client.beginSend({ senderAddress, recipients, content })
          → ACS SMTP relay sends the email
              → arrives in recipient's inbox
```

The sender address looks like: `no-reply@<your-subdomain>.azurecomm.net` OR a custom verified domain like `no-reply@moonshine.com`.

### What credentials you need from the resource owner

You need **exactly one thing** from whoever owns the ACS resource:

```
ACS_CONNECTION_STRING="endpoint=https://xxxx.communication.azure.com/;accesskey=XXXXXXXXX"
```

That string contains both the endpoint URL and the access key. It goes in your `.env` / `.env.local` — **never in client-side code**.

You also need to know:
- The **sender address** they have provisioned (e.g. `no-reply@moonshine.azurecomm.net`)
- Whether they are using a custom domain or the default `azurecomm.net` subdomain

---

## 3. HOW TESTING WORKS — COST IMPACT EXPLAINED

### Pricing model (so you understand the risk)

ACS Email charges **per email sent**. As of 2025 the rate is approximately **$0.00025 per email** (USD) — i.e. 1,000 emails = $0.25. There is also a free tier of **100 emails/month** on most subscriptions.

**What this means for your testing:**
- Sending 10–20 test emails during development costs essentially nothing (fractions of a cent).
- The resource owner will see the usage in Azure Cost Management — it will show as a tiny spike.
- You **cannot accidentally cause a large bill** by testing leave workflows. Even 500 test sends = ~12 cents.
- The only way to cause significant cost is if you trigger a bulk broadcast to hundreds of users repeatedly in a loop — which your app does not do automatically.

### Recommended test strategy (zero-surprise approach)

1. **Use a dummy `to` address you control** during local dev. In your `.env.local`, set a `DEBUG_EMAIL_OVERRIDE` env var. The new mailer will check: if this is set, all emails go to that single address regardless of the real recipient. This way you test the sending pipeline without emailing real colleagues.

2. **Count sends before triggering** — e.g. approving one leave sends 1 (employee) + N (broadcast to team). If your test DB has 5 employees, that is 6 emails max. All free tier.

3. **Log but don't send** option — the new mailer can be put in `DRY_RUN` mode (controlled by `ACS_DRY_RUN=true` in `.env.local`). It will log the email payload to console but not actually send. Use this for local smoke testing.

4. **Tell the resource owner** you will be doing integration tests — they can set a spend alert at $1 in Azure Cost Management so they get notified if anything unusual happens.

---

## 4. BUGS FOUND IN CURRENT SYSTEM (Fix alongside migration)

### Bug 1 — Admin Override sends NO email (critical gap)
`/api/admin/leaves/[id]/override/route.ts` — the route creates an in-app notification but **never calls `sendMail`**. There are even two unused templates (`adminOverride.ts`) that are designed for this but never imported. The employee gets no email when an admin forcefully approves/rejects their leave.

**Fix:** Import `buildLeaveStatusUpdateEmail` (already used elsewhere) and call `sendMail` after the override, mirroring the pattern in the revoke route. **Do not use `adminOverride.ts`** — it is a plain-body bare template inconsistent with the rest of the system. Use `buildLeaveStatusUpdateEmail` instead, which uses the `wrapEmailBody` branded shell.

### Bug 2 — Leave Cancel route sends NO email
`/api/leave/cancel/[id]/route.ts` — there is a `leaveCancelledTemplate` in templates but it is never imported or used. Manager and HR get an in-app notification but no email when an employee cancels.

**Fix:** Wire `leaveCancelledTemplate` to `sendMail` in the cancel route, sending to the employee's manager and HR.

### Bug 3 — Role change sends NO email
`/api/admin/users/[id]/role/route.ts` — `roleChangedTemplate` exists but is never called. Employees don't know their role changed unless they log in.

**Fix:** Import and call `roleChangedTemplate` + `sendMail` for the affected employee after the role update.

### Bug 4 — `adminOverride.ts` and `leaveCancelled.ts` use the OLD template style (inconsistency)
Several templates (`adminOverride.ts`, `announcementPosted.ts`, `holidayCreated.ts`, `roleChanged.ts`) return a plain `{ subject, body }` with raw unstyled HTML, while the newer templates (`leaveApplied.ts`, `leaveStatusUpdate.ts`, etc.) use the branded `wrapEmailBody()` shell from `shared.ts`. This means emails from these older templates will look completely different in the inbox.

**Fix:** Migrate all templates to use `wrapEmailBody()` for visual consistency. During the ACS migration is the perfect time to do this.

### Bug 5 — `adminOverride` route fetches `employee` without `notificationEmail`
```ts
employee: { select: { id: true, displayName: true, workEmail: true, managerId: true } }
```
Note that `notificationEmail` is missing from the select. Every other route includes it. `getNotificationEmail()` needs both `workEmail` and `notificationEmail` to do its job correctly. Without `notificationEmail`, it will fall back to `workEmail` always — meaning employees with a custom notification email will get emails to their work address instead.

**Fix:** Add `notificationEmail: true` to the employee select in the override route.

### Bug 6 — `hrAction.ts` template is entirely orphaned
This template covers `ONBOARDED`, `OFFBOARDED`, `BALANCE_ADJUSTED`, `LEAVE_REVOKED` — but is imported nowhere in the codebase. These are significant HR events that employees likely should receive email notifications for.

**Fix:** At minimum, wire `BALANCE_ADJUSTED` email to the relevant admin/HR route. Leave `ONBOARDED`/`OFFBOARDED` as a future task.

---

## 5. HOW THE NEW SYSTEM WILL LOOK

```
Before (Graph):                     After (ACS):
graphMailer.ts                      acsMailer.ts
  getAppAccessToken()                 EmailClient(ACS_CONNECTION_STRING)
  fetch graph.microsoft.com           client.beginSend(...)
  uses GRAPH_SENDER_EMAIL             uses ACS_SENDER_ADDRESS
  requires Entra app + M365           requires only ACS connection string
```

Every route imports `sendMail` from `@/lib/email/graphMailer`. After the migration, they will import from `@/lib/email/acsMailer` (or you rename the file and keep the same export name — transparent to all callers).

### New/changed files

| File | Action |
|---|---|
| `src/lib/email/acsMailer.ts` | **NEW** — replaces graphMailer.ts |
| `src/lib/email/graphMailer.ts` | **DELETE** (or keep as dead code with a deprecation comment) |
| `src/lib/auth/graphClient.ts` | **KEEP UNCHANGED** — still used for Entra auth/login, group sync, etc. Not email-related |
| `.env.example` | **UPDATE** — remove `GRAPH_SENDER_EMAIL`, add `ACS_CONNECTION_STRING`, `ACS_SENDER_ADDRESS`, `ACS_DRY_RUN` |
| `src/app/api/admin/leaves/[id]/override/route.ts` | **FIX** — add sendMail call (Bug 1) |
| `src/app/api/leave/cancel/[id]/route.ts` | **FIX** — add sendMail call (Bug 2) |
| `src/app/api/admin/users/[id]/role/route.ts` | **FIX** — add sendMail call (Bug 3) |
| All old-style templates | **MIGRATE** to use `wrapEmailBody()` (Bug 4) |
| `src/app/api/admin/leaves/[id]/override/route.ts` | **FIX** — add `notificationEmail` to select (Bug 5) |
| `package.json` | **ADD** `@azure/communication-email` dependency |

---

## 6. ANTIGRAVITY PROMPT

Copy and paste the entire block below to Antigravity.

---

### ── ANTIGRAVITY PROMPT START ──

```
You are working on a Next.js 14 + TypeScript project called Moonshine LMS (internal name: Monkstack HRM). 
The project uses Prisma + PostgreSQL, Azure Entra ID for auth, and currently sends emails via Microsoft 
Graph API (graphMailer.ts). 

Your task is to:
1. Replace the Graph-based email sender with Azure Communication Services (ACS) Email.
2. Fix several pre-existing bugs found in the email/notification system.
3. Maintain 100% consistency in code style, import paths, and email template appearance.

Do NOT touch any frontend UI files, Outlook mailto: links, login/auth flows, or graphClient.ts 
(which is still needed for Entra auth). Only touch the files explicitly listed below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 1 — INSTALL DEPENDENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to package.json dependencies:
  "@azure/communication-email": "^1.0.0"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2 — CREATE src/lib/email/acsMailer.ts (replaces graphMailer.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a new file src/lib/email/acsMailer.ts with the following exact behavior:

- Import EmailClient from @azure/communication-email
- Export an async function sendMail(params: SendMailParams): Promise<void>
  where SendMailParams is:
    {
      to: string[]
      cc?: string[]
      subject: string
      htmlBody: string
      saveToSentItems?: boolean   // kept for API compatibility, ignored by ACS
    }

- Read env vars:
    ACS_CONNECTION_STRING  — throws a clear error if missing
    ACS_SENDER_ADDRESS     — throws a clear error if missing
    ACS_DRY_RUN            — if "true", log the email payload to console and return without sending

- Guard: if ACS_CONNECTION_STRING is the placeholder "YOUR_ACS_CONNECTION_STRING" or empty, 
  log a warning "[acsMailer] ACS not configured. Email not sent: {subject}" and return 
  (same behavior as current graphMailer.ts guard for GRAPH_SENDER_EMAIL).

- DEBUG_EMAIL_OVERRIDE env var: if set, replace ALL to[] and cc[] addresses with this single 
  address. Log "[acsMailer] DEBUG_EMAIL_OVERRIDE active — redirecting to {override address}".

- Use client.beginSend() to send. Poll the poller to completion. If the operation status is 
  not "succeeded", throw an Error with the status message.

- Wrap the entire call in a try/catch. On catch, log "[acsMailer] Send failed: {error}" and 
  rethrow so callers can .catch(console.error) as they currently do.

- The function signature and export name must remain exactly: export async function sendMail(...)
  This is important — all route files import { sendMail } and must continue to work with zero 
  changes to those import lines.

- Export the SendMailParams interface as a named export.

Example structure (implement properly, not as a stub):

  import { EmailClient } from '@azure/communication-email'

  export interface SendMailParams {
    to: string[]
    cc?: string[]
    subject: string
    htmlBody: string
    saveToSentItems?: boolean
  }

  export async function sendMail(params: SendMailParams): Promise<void> {
    const connectionString = process.env.ACS_CONNECTION_STRING
    const senderAddress   = process.env.ACS_SENDER_ADDRESS
    const isDryRun        = process.env.ACS_DRY_RUN === 'true'
    const debugOverride   = process.env.DEBUG_EMAIL_OVERRIDE?.trim()

    if (!connectionString || connectionString === 'YOUR_ACS_CONNECTION_STRING') {
      console.warn('[acsMailer] ACS not configured. Email not sent:', params.subject)
      return
    }
    if (!senderAddress) {
      console.warn('[acsMailer] ACS_SENDER_ADDRESS not set. Email not sent:', params.subject)
      return
    }

    const toAddresses   = debugOverride ? [debugOverride] : params.to.filter(Boolean)
    const ccAddresses   = debugOverride ? [] : (params.cc ?? []).filter(Boolean)

    if (debugOverride) {
      console.log(`[acsMailer] DEBUG_EMAIL_OVERRIDE active — redirecting to ${debugOverride}`)
    }

    if (isDryRun) {
      console.log('[acsMailer] DRY RUN — would send:', {
        to: toAddresses, cc: ccAddresses, subject: params.subject,
      })
      return
    }

    const client = new EmailClient(connectionString)

    const message = {
      senderAddress,
      recipients: {
        to:  toAddresses.map(address => ({ address })),
        cc:  ccAddresses.map(address => ({ address })),
      },
      content: {
        subject:  params.subject,
        html:     params.htmlBody,
      },
    }

    const poller = await client.beginSend(message)
    const result = await poller.pollUntilDone()

    if (result.status !== 'Succeeded') {
      throw new Error(`[acsMailer] Send failed with status: ${result.status}`)
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 3 — UPDATE ALL IMPORT REFERENCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In every file listed below, change the import:
  FROM: import { sendMail } from '@/lib/email/graphMailer'
  TO:   import { sendMail } from '@/lib/email/acsMailer'

Files to update:
  - src/app/api/leave/apply/route.ts
  - src/app/api/manager/approvals/[id]/route.ts
  - src/app/api/hr/leaves/[id]/revoke/route.ts

After updating, delete src/lib/email/graphMailer.ts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 4 — FIX BUG: Admin Override sends no email
File: src/app/api/admin/leaves/[id]/override/route.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current state: The route updates DB, creates in-app notifications, but never sends any email.

Fix:
1. Add `notificationEmail: true` to the employee select (currently missing):
   employee: { select: { id: true, displayName: true, workEmail: true, notificationEmail: true, managerId: true } }

2. Add these imports at the top of the file:
   import { sendMail } from '@/lib/email/acsMailer'
   import { buildLeaveStatusUpdateEmail } from '@/lib/email/templates/leaveStatusUpdate'
   import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

3. After the existing `await prisma.notification.create(...)` call for the employee,
   add an email send block:

   const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
   const employeeAddress = getNotificationEmail(leave.employee)

   const { subject: empSubject, htmlBody: empBody } = buildLeaveStatusUpdateEmail({
     employeeName:    leave.employee.displayName,
     startDate:       leave.startDate,
     endDate:         leave.endDate,
     totalDays:       leave.totalDays,
     status:          newStatus as 'APPROVED' | 'REJECTED',
     reason:          leave.reason,
     approverComment: `[Admin Override] ${reason}`,
     appBaseUrl,
     leaveId:         leave.id,
     recipientRole:   'EMPLOYEE',
   })
   await sendMail({ to: [employeeAddress], subject: empSubject, htmlBody: empBody }).catch(console.error)

4. Also notify the manager via email if they exist:
   if (leave.employee.managerId) {
     const manager = await prisma.employee.findUnique({
       where: { id: leave.employee.managerId },
       select: { workEmail: true, notificationEmail: true },
     })
     if (manager) {
       const managerAddress = getNotificationEmail(manager)
       const { subject: mgrSubject, htmlBody: mgrBody } = buildLeaveStatusUpdateEmail({
         employeeName:    leave.employee.displayName,
         startDate:       leave.startDate,
         endDate:         leave.endDate,
         totalDays:       leave.totalDays,
         status:          newStatus as 'APPROVED' | 'REJECTED',
         reason:          leave.reason,
         approverComment: `[Admin Override] ${reason}`,
         appBaseUrl,
         leaveId:         leave.id,
         recipientRole:   'MANAGER',
       })
       await sendMail({ to: [managerAddress], subject: mgrSubject, htmlBody: mgrBody }).catch(console.error)
     }
   }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 5 — FIX BUG: Leave Cancel sends no email
File: src/app/api/leave/cancel/[id]/route.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inspect this file. It currently cancels a leave and sends in-app notifications, but 
never sends email.

Add the following after the leave is cancelled and after the notification is created:

1. Add imports:
   import { sendMail } from '@/lib/email/acsMailer'
   import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

2. Fetch the employee's manager and HR/Admin list (only if not already fetched in this route).

3. Build the email using an INLINE template (do NOT use the old leaveCancelledTemplate from 
   leaveCancelled.ts — it is inconsistent with the rest of the system). Instead build it 
   directly using wrapEmailBody from '@/lib/email/templates/shared':

   import { wrapEmailBody, detailRow, detailCard } from '@/lib/email/templates/shared'

   const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
   const startStr = fmtDate(leave.startDate)
   const endStr   = fmtDate(leave.endDate)

   const rows = [
     detailRow('Employee', employee.displayName),
     detailRow('Cancelled Period', `${startStr} – ${endStr}`),
     detailRow('Duration', `${leave.totalDays} day${leave.totalDays !== 1 ? 's' : ''}`),
   ].join('\n')

   const htmlBody = wrapEmailBody({
     preheader:  `${employee.displayName} has cancelled their leave request`,
     badgeText:  '🚫 Leave Cancelled',
     badgeColor: 'indigo',
     headline:   `${employee.displayName} cancelled their leave request`,
     bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                    The leave request below has been cancelled by the employee. No action is required.
                  </p>${detailCard(rows)}`,
   })
   const subject = `Leave Cancelled: ${employee.displayName} (${startStr} – ${endStr})`

4. Send to the manager (if exists) and all HR/Admin, skipping duplicates 
   (same pattern as /api/leave/apply/route.ts).

Also: ensure the employee select in this route includes `notificationEmail: true` and 
`manager: { select: { workEmail: true, notificationEmail: true, displayName: true } }` 
for consistency.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 6 — FIX BUG: Role change sends no email
File: src/app/api/admin/users/[id]/role/route.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inspect this file. After the role is updated, add an email to the affected employee.

1. Add imports:
   import { sendMail } from '@/lib/email/acsMailer'
   import { wrapEmailBody, detailRow, detailCard } from '@/lib/email/templates/shared'
   import { getNotificationEmail } from '@/lib/email/getNotificationEmail'

2. Do NOT use the old roleChanged.ts template. Build inline using wrapEmailBody:

   const rows = [
     detailRow('Previous Role', oldRole),
     detailRow('New Role',      newRole),
     detailRow('Effective',     'Immediately — please log out and log back in'),
   ].join('\n')

   const htmlBody = wrapEmailBody({
     preheader:  'Your role in Monkstack HRM has been updated',
     badgeText:  '🔄 Role Updated',
     badgeColor: 'blue',
     headline:   'Your access role has been updated',
     bodyHtml:   `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                    Your role in the Monkstack HRM system has been changed. 
                    Please log out and log back in for the new permissions to take effect.
                    If you believe this is an error, contact HR immediately.
                  </p>${detailCard(rows)}`,
     buttons: [{ label: 'Go to Login', url: `${appBaseUrl}/login` }],
   })
   const subject = `[Monkstack HRM] Your role has been updated to ${newRole}`

3. Call:
   await sendMail({ to: [getNotificationEmail(employee)], subject, htmlBody }).catch(console.error)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 7 — UPDATE .env.example
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace the Microsoft Graph email section:

  REMOVE:
    # Microsoft Graph (email sending — app-level)
    GRAPH_SENDER_EMAIL="no-reply@moonshine.onmicrosoft.com"

  ADD:
    # Azure Communication Services — Email
    # Get the connection string from the ACS resource → Keys blade in Azure Portal
    ACS_CONNECTION_STRING="YOUR_ACS_CONNECTION_STRING"
    # The sender address provisioned on the ACS Email Domain
    # Format: no-reply@<subdomain>.azurecomm.net  OR  no-reply@yourdomain.com (if custom domain)
    ACS_SENDER_ADDRESS="no-reply@moonshine.azurecomm.net"
    # Set to "true" in local dev to log emails without actually sending them
    ACS_DRY_RUN="false"
    # Optional: override all email recipients with this address during testing
    # DEBUG_EMAIL_OVERRIDE="your-personal@email.com"

Also add a comment at the top of the graph credentials section clarifying they are used for 
AUTH ONLY (not email):
    # Azure Entra ID / MSAL — used for authentication and user sync ONLY (not email)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 8 — CONSISTENCY: Migrate old templates to use wrapEmailBody
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following template files return unstyled plain HTML that looks completely different 
from the rest of the branded emails. Migrate them to use wrapEmailBody() from shared.ts.
You do NOT need to wire them to sendMail (Tasks 5 and 6 do that inline) — just make the 
templates internally consistent in case they are used in future:

Files to migrate:
  - src/lib/email/templates/adminOverride.ts
  - src/lib/email/templates/announcementPosted.ts
  - src/lib/email/templates/holidayCreated.ts
  - src/lib/email/templates/roleChanged.ts
  - src/lib/email/templates/leaveCancelled.ts

For each: change the return type to { subject: string; htmlBody: string } (matching newer 
templates). Replace the raw HTML body string with a wrapEmailBody() call. Keep all data 
parameters the same so they remain a non-breaking change. Use appropriate badgeColor 
and emoji matching the event type. Refer to leaveApplied.ts and leaveStatusUpdate.ts for 
the style pattern to follow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT CONSTRAINTS — DO NOT VIOLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DO NOT modify src/lib/auth/graphClient.ts — it is used for Azure Entra ID authentication 
   and user/group sync. It has nothing to do with email.

2. DO NOT modify any frontend .tsx files.

3. DO NOT modify any Outlook mailto: links or "Contact HR" buttons in the UI.

4. DO NOT remove AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, or AZURE_AD_CLIENT_SECRET from 
   .env.example — these are still required for login.

5. The sendMail function export name must not change. All 3 existing callers import it by 
   that exact name. Changing the name would break everything.

6. All new sendMail calls must follow the existing pattern of .catch(console.error) so that 
   email failures never crash the API response.

7. The existing in-app notifications (prisma.notification.create/createMany) must NOT be 
   removed. Emails are additive — they complement, not replace, in-app notifications.

8. Preserve all existing emailsSent tracking fields on leaveRequest (e.g. emailsSent: { applied: false }).
   This field exists in the DB schema and is set in the leave apply route.
```

### ── ANTIGRAVITY PROMPT END ──

---

## 7. WHAT YOU NEED TO DO ON YOUR SIDE

These are the things only **you** can do — Antigravity cannot do them:

### Step 1 — Get these from the ACS resource owner
```
ACS_CONNECTION_STRING=endpoint=https://xxxx.communication.azure.com/;accesskey=XXXXX
ACS_SENDER_ADDRESS=no-reply@<their-domain>.azurecomm.net
```
Ask them specifically: *"What is the connection string and sender address for the ACS Email resource?"*

### Step 2 — Add to your .env and .env.local
```env
ACS_CONNECTION_STRING="<from resource owner>"
ACS_SENDER_ADDRESS="<from resource owner>"
ACS_DRY_RUN="true"                          # keep true until you're ready to test real sends
DEBUG_EMAIL_OVERRIDE="your@email.com"       # your own email for testing
```

### Step 3 — Test order
1. Set `ACS_DRY_RUN=true` first — all emails log to console only, zero cost, zero sends.
2. Set `DEBUG_EMAIL_OVERRIDE=your@email.com`, set `ACS_DRY_RUN=false` — all emails come to you only.
3. Apply a leave as a test user. Check your inbox. Verify the email looks right.
4. Once confirmed, remove `DEBUG_EMAIL_OVERRIDE` for production.

### Step 4 — Inform the ACS resource owner
Tell them: "I'll be doing integration tests — expect 10–30 test emails over a day or two." They can watch Azure Cost Management if they want, but the cost will be negligible.

---

## 8. SUMMARY TABLE — FILES TOUCHED BY THIS MIGRATION

| File | Change |
|---|---|
| `src/lib/email/acsMailer.ts` | **CREATE** |
| `src/lib/email/graphMailer.ts` | **DELETE** |
| `src/app/api/leave/apply/route.ts` | Update import only |
| `src/app/api/manager/approvals/[id]/route.ts` | Update import only |
| `src/app/api/hr/leaves/[id]/revoke/route.ts` | Update import only |
| `src/app/api/admin/leaves/[id]/override/route.ts` | Fix: add sendMail + fix select |
| `src/app/api/leave/cancel/[id]/route.ts` | Fix: add sendMail |
| `src/app/api/admin/users/[id]/role/route.ts` | Fix: add sendMail |
| `src/lib/email/templates/adminOverride.ts` | Migrate to wrapEmailBody |
| `src/lib/email/templates/announcementPosted.ts` | Migrate to wrapEmailBody |
| `src/lib/email/templates/holidayCreated.ts` | Migrate to wrapEmailBody |
| `src/lib/email/templates/roleChanged.ts` | Migrate to wrapEmailBody |
| `src/lib/email/templates/leaveCancelled.ts` | Migrate to wrapEmailBody |
| `.env.example` | Update env var docs |
| `package.json` | Add `@azure/communication-email` |
| `src/lib/auth/graphClient.ts` | **DO NOT TOUCH** |
| All frontend `.tsx` files | **DO NOT TOUCH** |
