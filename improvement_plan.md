# Monkstack LMS — Improvement Plan

**Date**: April 28, 2026  
**Codebase**: Next.js 14 App Router · TypeScript · Prisma/PostgreSQL · Azure AD  
**Lines of Code**: ~15,000+  

---

## Executive Summary

The codebase is well-structured with good fundamentals — strong JWT validation, excellent audit logging, solid database design, and modern tooling. However, there are critical security authorization gaps, zero test coverage, duplicate database operations, and systemic code-quality issues that must be addressed before a production deployment can be considered stable and safe.

**Verdict**: Requires 4–6 weeks of hardening before production.

---

## Part 1 — Critical Issues (Fix Immediately)

### 1.1 Manager Authorization Bypass

**Severity**: CRITICAL  
**Files**: `src/app/api/manager/approvals/[id]/route.ts`, `src/app/api/manager/employees/[id]/route.ts`

Any authenticated Manager can call these endpoints with an arbitrary employee ID and view or approve leaves for employees completely outside their team. The role check (`requireRole(token, ['MANAGER'])`) passes, but there is no subsequent check that the target employee is actually managed by the requesting user.

**Fix**:
```typescript
// After fetching the leave request
if (token.role === 'MANAGER') {
  const isTeamMember = await prisma.employee.findUnique({
    where: { id: leave.employeeId, managerId: token.userId }
  })
  if (!isTeamMember) throw new Error('FORBIDDEN')
}
```
Apply the same guard to the employee detail route.

---

### 1.2 Duplicate Ledger Deletions on Employee Removal

**Severity**: CRITICAL  
**File**: `src/lib/auth/azureTenantSync.ts` (lines 121–124)

Two consecutive delete statements are duplicated for `leaveRequest` and `leaveBalance` inside the sync transaction. Although idempotent in most cases, this signals unreviewed logic and risks transaction bloat or unexpected behavior on cascading relations.

**Fix**: Remove the duplicate lines (123–124) — they are exact copies of lines 121–122.

---

### 1.3 Real Azure Credentials in `.env.example`

**Severity**: CRITICAL  
**File**: `.env.example` (lines 8–9)

The example file contains actual Azure AD Client ID and Tenant ID GUIDs instead of placeholder strings. If this repository is ever made public or cloned by a contractor, these credentials are immediately exposed.

**Fix**: Replace with obvious placeholder values:
```
NEXT_PUBLIC_AZURE_AD_CLIENT_ID="your-azure-ad-client-id-here"
NEXT_PUBLIC_AZURE_AD_TENANT_ID="your-azure-ad-tenant-id-here"
```
Also rotate the exposed credentials in Azure Portal as a precaution.

---

### 1.4 Zero Test Coverage

**Severity**: CRITICAL  
**Impact**: Cannot safely refactor, deploy with confidence, or catch regressions

No test files, no test runner, no CI test step exist anywhere in the project. The most security-sensitive and business-critical code (`validateToken.ts`, `balanceService.ts`, `leaveValidator.ts`) is completely untested.

**Fix (Phase 3 below)**: Set up Vitest + Testing Library and write a minimum coverage baseline for `src/lib/`.

---

## Part 2 — High Severity Issues

### 2.1 No Rate Limiting on State-Changing API Routes

Any attacker with a valid token can enumerate leave IDs and mass-approve or mass-reject leaves by brute-forcing `/api/manager/approvals/[id]` or `/api/hr/leaves/[id]/revoke` without triggering any throttling.

**Fix**: Add an edge-level rate limiter (e.g. `@upstash/ratelimit` with Vercel KV, or a simple in-memory map for Azure Container Apps). Start with 30 requests / minute per user.

---

### 2.2 `DEV_BYPASS_AUTH` Check in Production Code

**File**: `src/app/api/calendar/events/route.ts` (line 7)

```typescript
if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
  return NextResponse.json([])
}
```

If `DEV_BYPASS_AUTH=true` is accidentally set in a production environment (a realistic mistake), the entire auth flow for this endpoint is bypassed silently.

**Fix**: Remove this block. Use a mock Graph client instead for local development.

---

### 2.3 Missing Database Indexes

The following columns are heavily used in `WHERE` and `JOIN` clauses but have no explicit index in the Prisma schema, which will cause full table scans as the dataset grows:

| Model | Column(s) | Query Pattern |
|---|---|---|
| `LeaveRequest` | `employeeId` | Filter by employee |
| `LeaveRequest` | `approverId` | Revoke / approval flows |
| `LeaveRequest` | `status` | Pending approvals list |
| `Employee` | `managerId` | Team member lookup |
| `Notification` | `recipientId, isRead` | Unread count queries |
| `AuditLog` | `performedBy, createdAt` | Audit trail queries |
| `LeaveBalance` | `employeeId, year` | Annual balance lookup |

**Fix** — add to `prisma/schema.prisma`:
```prisma
model LeaveRequest {
  @@index([employeeId])
  @@index([approverId])
  @@index([status])
  @@index([employeeId, status, createdAt])
}

model Employee {
  @@index([managerId])
}

model Notification {
  @@index([recipientId, isRead])
}
```

---

### 2.4 Silent Email Notification Failures

**File**: `src/app/api/leave/apply/route.ts` (lines 169, 182)

```typescript
await sendMail({ ... }).catch(console.error)
```

Email failures are swallowed. The user's request succeeds but managers and HR may never receive the notification. No retry, no fallback, no user-facing warning.

**Fix**: Log failures to the AuditLog, and return a partial-success response body that the client can surface (e.g. `{ success: true, warnings: ['Manager notification failed'] }`).

---

### 2.5 Missing Input Validation on Query Parameters

**File**: `src/app/api/hr/leaves/route.ts` (line 15)

`employeeId` from the query string is passed directly into Prisma without UUID format validation. An invalid value causes a Prisma error that leaks schema information in the stack trace.

**Fix**: Validate with Zod before use:
```typescript
const employeeId = searchParams.get('employeeId')
if (employeeId && !z.string().uuid().safeParse(employeeId).success) {
  return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 })
}
```

---

### 2.6 No Audit Trail on Data Exports

**Files**: `src/app/api/hr/employees/export/route.ts`, `src/app/api/hr/reports/export/route.ts`

HR can export full employee records (including emergency contact details) with no audit log entry. This is a GDPR compliance gap — data access must be traceable.

**Fix**: Call `createAuditLog(...)` inside each export handler before returning the file, recording who exported what and when.

---

## Part 3 — Medium Severity Issues

### 3.1 Error Handling Code Duplicated Across 30+ Routes

Every API route repeats the same catch block:
```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown'
  if (message === 'UNAUTHORIZED') return NextResponse.json(...)
  if (message === 'FORBIDDEN') return NextResponse.json(...)
  console.error('[...] Error:', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

**Fix**: Extract to `src/lib/utils/apiError.ts`:
```typescript
export function handleApiError(err: unknown, context: string): NextResponse {
  const message = err instanceof Error ? err.message : 'Unknown'
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  console.error(`[${context}]`, err)
  return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
}
```

---

### 3.2 Missing Unique Constraint on `LeaveBalance`

**File**: `prisma/schema.prisma`

`LeaveBalance` can have multiple records for the same `(employeeId, year)` pair. A concurrent request race could insert a duplicate row, causing split balances.

**Fix**:
```prisma
model LeaveBalance {
  @@unique([employeeId, year])
}
```

---

### 3.3 Cron Sync Secret Has No Rate Limiting or HMAC Signing

**File**: `src/app/api/admin/users/sync/route.ts`

The shared `x-sync-secret` header is compared with a plain string. If leaked, an attacker can trigger expensive Azure Graph API syncs without limit.

**Fix**: Switch to HMAC-signed requests with a timestamp to prevent replay attacks, and log all sync invocations.

---

### 3.4 Inconsistent Date Serialization

Some routes use `.toISOString()`, others use `.toLocaleDateString()`. This creates timezone inconsistencies and makes API responses unpredictable for front-end consumers.

**Fix**: Standardize on ISO 8601 (`.toISOString()`) everywhere. Formatting for display belongs in UI components, never in API responses.

---

### 3.5 No Request ID / Correlation ID in Logs

When an error occurs in production it is currently impossible to trace a specific user request through the logs because there is no correlation ID attached to each request.

**Fix**: In `src/middleware.ts`, generate a `requestId` (e.g. `crypto.randomUUID()`) and attach it as a request header. Log it in every `console.error` call.

---

### 3.6 Calendar API Returns Empty Array on Graph API Error

**File**: `src/app/api/calendar/events/route.ts` (line 40)

```typescript
return NextResponse.json([])  // Returned on Graph API failure
```

Clients cannot distinguish between "no events scheduled" and "Graph API is down," leading to silent data loss in the UI.

**Fix**: Return an error response on failure, and handle it gracefully in the client component.

---

## Part 4 — Low Severity / Housekeeping

### 4.1 `HalfDayType` Enum Is Too Narrow

**File**: `prisma/schema.prisma`

The current enum only has `NONE` and `HALF_DAY`. The schema can't represent which half of the day is taken without inferring from both `startHalfDay` and `endHalfDay` fields together.

**Suggested Enum**:
```prisma
enum HalfDayType {
  NONE        // Full day
  MORNING     // Morning half
  AFTERNOON   // Afternoon half
}
```

---

### 4.2 Undocumented Environment Variables

`USER_SYNC_CRON_SECRET`, `ENTRA_GROUP_ID_*` (role-to-group mappings), and `APPLICATIONINSIGHTS_CONNECTION_STRING` are used in code but not listed in `.env.example`.

**Fix**: Add all used env vars to `.env.example` with descriptive placeholder values and a short comment per variable.

---

### 4.3 `any` Type Usage in Leave Application Logic

**File**: `src/app/api/leave/apply/route.ts` (lines 21–22)

```typescript
const normalizedStartHalfDay: any = startHalfDay === 'HALF_DAY' ? 'HALF_DAY' : 'NONE'
```

**Fix**: Use the Prisma-generated `HalfDayType` enum directly.

---

### 4.4 Pagination Metadata Missing from Audit Endpoints

**Files**: `src/app/api/admin/audit/route.ts`, `src/app/api/hr/audit/route.ts`

Responses use `take`/`skip` but don't return `total` count, making it impossible to build a proper paginator on the front end.

**Fix**: Add a `prisma.$transaction([query, prisma.auditLog.count(...)])` pattern to return `{ data, total, page, pageSize }`.

---

## Phased Remediation Roadmap

### Phase 1 — Security Hardening (Week 1–2)

- [ ] Fix manager team isolation checks in `approvals/[id]` and `employees/[id]`
- [ ] Remove duplicate delete statements in `azureTenantSync.ts`
- [ ] Replace real credentials in `.env.example` and rotate in Azure
- [ ] Remove `DEV_BYPASS_AUTH` block from production code
- [ ] Add audit log entries to all data export endpoints
- [ ] Add UUID validation to query parameter inputs

### Phase 2 — Code Quality (Week 2–4)

- [ ] Extract `handleApiError` utility and replace all 30+ duplicate catch blocks
- [ ] Add missing `@@index` declarations to Prisma schema + run migration
- [ ] Add `@@unique([employeeId, year])` to `LeaveBalance`
- [ ] Standardize all date serialization to ISO 8601
- [ ] Add Request ID correlation header in middleware and propagate to logs
- [ ] Fix `HalfDayType` enum; migrate existing data
- [ ] Document all environment variables in `.env.example`
- [ ] Fix `any` type in leave application route

### Phase 3 — Testing Infrastructure (Week 3–5)

- [ ] Add Vitest + `@testing-library/react` to dev dependencies
- [ ] Write unit tests for `src/lib/auth/validateToken.ts`
- [ ] Write unit tests for `src/lib/leave/balanceService.ts`
- [ ] Write unit tests for `src/lib/leave/leaveValidator.ts`
- [ ] Write integration tests for manager authorization routes
- [ ] Write integration tests for HR data export audit trail
- [ ] Add GitHub Actions CI step: `npm run test -- --coverage`
- [ ] Enforce 70%+ branch coverage on `src/lib/`

### Phase 4 — Performance & Observability (Week 5–6)

- [ ] Add rate limiting middleware (30 req/min per user on write routes)
- [ ] Fix calendar API to return proper error instead of empty array
- [ ] Add pagination metadata (`total`, `page`, `pageSize`) to audit endpoints
- [ ] Verify Application Insights is wired up and emitting request traces
- [ ] Add `requestId` to all error logs
- [ ] Upgrade Recharts from 2.x to latest stable

### Phase 5 — Documentation (Week 6)

- [ ] Document the full authorization model (who can do what, and why)
- [ ] Add API endpoint reference (can use Swagger/OpenAPI)
- [ ] Add `.env.local.example` with all variables, descriptions, and source instructions
- [ ] Add architecture diagram to `docs/`
- [ ] Add troubleshooting guide for Azure AD / MSAL setup issues

---

## Appendix A — Authorization Model (Target State)

| Role | Can view | Can approve | Can export | Scope |
|---|---|---|---|---|
| EMPLOYEE | Own leave only | N/A | Own data | Self |
| MANAGER | Own team's leave | Own team's leave | N/A | `managerId = self` |
| HR | All employees | All pending leaves | All data (audited) | Global |
| ADMIN | Everything | Everything | Everything (audited) | Global |

Currently MANAGER scope is not enforced at the data layer — this is the #1 fix.

---

## Appendix B — Recommended Test Coverage Targets

| Module | Priority | Min Coverage |
|---|---|---|
| `src/lib/auth/validateToken.ts` | CRITICAL | 90% |
| `src/lib/leave/balanceService.ts` | CRITICAL | 85% |
| `src/lib/leave/leaveValidator.ts` | CRITICAL | 85% |
| `src/app/api/manager/**` | HIGH | 75% |
| `src/app/api/hr/**` | HIGH | 75% |
| `src/lib/audit/` | HIGH | 70% |
| `src/lib/email/` | MEDIUM | 60% |
| `src/components/**` | LOW | 40% |

---

*Generated by Claude Code on 2026-04-28 based on static analysis of the full codebase.*
