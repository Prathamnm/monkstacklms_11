# 🚀 CURSOR PROMPT — MOONSHINE LEAVE MANAGEMENT SYSTEM (LMS)

> **Application Name:** Moonshine LMS  
> **Purpose:** Enterprise HR & Leave Management System with role-based dashboards, Microsoft Entra ID SSO, accrual-based leave engine, project-awareness, and Outlook email notifications.  
> **Deployment Target:** Azure (App Service + PostgreSQL Flexible Server), but **must run 100% locally first** via Docker + `npm run dev`.

---

## TABLE OF CONTENTS

1. [Project Overview & Goals](#1-project-overview--goals)
2. [Full Technology Stack](#2-full-technology-stack)
3. [Folder & File Structure](#3-folder--file-structure)
4. [Authentication & Authorization (Entra ID + MSAL)](#4-authentication--authorization-entra-id--msal)
5. [Database Schema (Prisma + PostgreSQL)](#5-database-schema-prisma--postgresql)
6. [Role System & Routing](#6-role-system--routing)
7. [UI Design System & Animations](#7-ui-design-system--animations)
8. [Shared Layout & Navigation](#8-shared-layout--navigation)
9. [Employee Dashboard](#9-employee-dashboard)
10. [Manager Dashboard](#10-manager-dashboard)
11. [HR Dashboard](#11-hr-dashboard)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Leave Engine & Accrual System](#13-leave-engine--accrual-system)
14. [Project & Availability System](#14-project--availability-system)
15. [Email Notification System (Microsoft Graph + Outlook)](#15-email-notification-system-microsoft-graph--outlook)
16. [In-App Notification System](#16-in-app-notification-system)
17. [Audit & Logging System](#17-audit--logging-system)
18. [Backend API Routes (Full List)](#18-backend-api-routes-full-list)
19. [Environment Variables & Configuration](#19-environment-variables--configuration)
20. [Local Development Setup](#20-local-development-setup)
21. [Azure Deployment Configuration](#21-azure-deployment-configuration)
22. [Security Requirements](#22-security-requirements)
23. [Build Phase Checklist](#23-build-phase-checklist)

---

## 1. PROJECT OVERVIEW & GOALS

Build a **full-stack enterprise Leave Management System** called **Moonshine LMS** with the following core requirements:

### User Roles (4 roles, 15 total users in Entra ID tenant)
| Role | Count | Access Level |
|------|-------|-------------|
| Employee | 12 | Apply leave, view projects/team availability |
| Manager | 1 | Approve/reject leave, manage projects, view team |
| HR | 1 | Employee lifecycle, all leaves, rules configuration, reports |
| Admin | 1 | Full system access: all HR powers + system configuration + user management |

### Core Feature Modules
1. **Authentication** — Microsoft Entra ID SSO via MSAL; role derived from Entra group membership
2. **Employee Directory** — Searchable, filterable list of all employees with profile details
3. **Leave Management** — Accrual-based (18 standard + 2 emergency), half-day support, carry-forward, balance tracking
4. **Project Tagging & Availability** — Each employee tagged to projects; availability visible to team members, manager, HR
5. **Approval Workflow** — Pending approvals sent to manager; HR in CC; email chain via Outlook
6. **Outlook Email Chain** — Official email notifications for every state change via Microsoft Graph
7. **HR Console** — Full lifecycle management, leave override, reports, rules
8. **Admin Panel** — System config, user management, audit logs, accrual rules

### Key Business Rules
- Leave total: **18 standard + 2 emergency = 20 total per year**
- Leave accrual: **1.5 days/month** (standard), emergency leaves granted as lump sum at year start
- **Carry-forward**: unused standard leaves carry forward (configurable max, default 10 days)
- **Half-day support**: First half / Second half; counts as 0.5 days
- **Balance deduction**: Only on approval (not on submission)
- **Cancellation**: Employee can cancel only BEFORE leave start date; after start → only HR/Admin can revoke
- **Project awareness warnings**: System warns if teammates on same project are also on leave (advisory, not blocking)
- **On-leave indicator**: Any approved leave shows "On Leave" / "Half Day" badge on that employee's profile on that specific day

---

## 2. FULL TECHNOLOGY STACK

### Frontend
```
Next.js 14 (App Router)         — Full-stack framework with SSR, ISR, API routes
React 18                         — UI rendering with concurrent features
TypeScript 5                     — Strict type safety across entire codebase
Tailwind CSS 3                   — Utility-first styling
shadcn/ui                        — Pre-built accessible component library
Framer Motion                    — Page transitions, micro-animations, entrance effects
Lucide React                     — Icon library (consistent icon set)
React Hook Form + Zod            — Form validation with schema-driven errors
@tanstack/react-query v5         — Server state management, caching, background refetch
date-fns                         — Date manipulation and formatting
react-day-picker                 — Calendar component for leave date selection
recharts                         — Charts for HR analytics dashboard
react-hot-toast                  — Toast notifications
```

### Authentication & Identity
```
@azure/msal-browser              — Client-side MSAL for browser
@azure/msal-react                — React hooks/components for MSAL
@microsoft/microsoft-graph-client — Graph API calls (groups, email)
jose                             — JWT validation on backend (JWKS, issuer, audience)
```

### Backend (Next.js API Routes)
```
Next.js API Routes (Node 20)     — REST endpoints under /api/
Prisma ORM 5                     — Type-safe PostgreSQL access layer
Prisma Client                    — Auto-generated typed DB client
node-cron                        — Scheduled tasks (accrual engine)
nodemailer / Graph Mail API      — Email delivery via Outlook
xlsx                             — Excel report generation for HR exports
csv-stringify                    — CSV report generation
```

### Database
```
PostgreSQL 15                    — Primary database (local: Docker, production: Azure DB for PostgreSQL Flexible Server)
Prisma Migrations                — Schema versioning and migration
```

### Dev & Infrastructure
```
Docker + docker-compose          — Local PostgreSQL + pgAdmin
ESLint + Prettier                — Code quality
Husky + lint-staged              — Pre-commit hooks
dotenv                           — Environment variable management
ts-node                          — TypeScript script execution (seed scripts)
```

### Azure (Production Deployment)
```
Azure App Service (Node 20)      — Hosts Next.js app
Azure Database for PostgreSQL    — Managed PostgreSQL
Azure Key Vault                  — Secrets management
Azure Blob Storage               — File attachments (future)
Azure Application Insights       — Monitoring and telemetry
Azure Static Web Apps (optional) — Alternative hosting
```

---

## 3. FOLDER & FILE STRUCTURE

```
moonshine-lms/
├── .env.local                          # Local environment variables
├── .env.example                        # Template for env vars
├── .eslintrc.json
├── .prettierrc
├── docker-compose.yml                  # PostgreSQL + pgAdmin local setup
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma                   # Full Prisma schema
│   ├── migrations/                     # Auto-generated migration files
│   └── seed.ts                         # Seed script for dev data
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (MSAL Provider wraps everything)
│   │   ├── page.tsx                    # Root redirects to /login or /dashboard
│   │   ├── login/
│   │   │   └── page.tsx               # Login page — "Sign in with Microsoft"
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx           # MSAL redirect handler
│   │   ├── unauthorized/
│   │   │   └── page.tsx               # 403 Unauthorized page
│   │   ├── (dashboard)/               # Route group — all protected routes share layout
│   │   │   ├── layout.tsx             # Dashboard shell: sidebar + top header
│   │   │   ├── employee/
│   │   │   │   ├── layout.tsx         # Employee-specific sidebar config
│   │   │   │   ├── projects/
│   │   │   │   │   └── page.tsx       # My Projects — team availability view
│   │   │   │   ├── apply-leave/
│   │   │   │   │   └── page.tsx       # Apply Leave — calendar + form
│   │   │   │   ├── my-leaves/
│   │   │   │   │   └── page.tsx       # My Leave History + balance card
│   │   │   │   └── my-team/
│   │   │   │       └── page.tsx       # My Team — availability per team member
│   │   │   ├── manager/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx       # Manager home — stats + pending queue
│   │   │   │   ├── approvals/
│   │   │   │   │   ├── page.tsx       # Pending approvals list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx   # Single approval detail
│   │   │   │   ├── employees/
│   │   │   │   │   └── page.tsx       # View all employees (read-only for manager)
│   │   │   │   └── projects/
│   │   │   │       ├── page.tsx       # View + manage projects
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx   # Project detail — allocate/remove members
│   │   │   ├── hr/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx       # HR home — org summary stats
│   │   │   │   ├── employees/
│   │   │   │   │   ├── page.tsx       # Employee directory (editable)
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx   # Employee profile + edit
│   │   │   │   ├── lifecycle/
│   │   │   │   │   ├── page.tsx       # Onboard / Offboard hub
│   │   │   │   │   └── onboard/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── leaves/
│   │   │   │   │   ├── page.tsx       # All leaves — filter by employee/status/date
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx   # Leave detail + revoke
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx       # Export reports (CSV / Excel)
│   │   │   │   └── rules/
│   │   │   │       └── page.tsx       # Accrual rules configuration
│   │   │   └── admin/
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx       # Admin home — system overview
│   │   │       ├── users/
│   │   │       │   └── page.tsx       # All users management
│   │   │       ├── employees/
│   │   │       │   └── page.tsx       # Full employee management
│   │   │       ├── leaves/
│   │   │       │   └── page.tsx       # All leaves + override
│   │   │       ├── projects/
│   │   │       │   └── page.tsx       # Project management
│   │   │       ├── audit/
│   │   │       │   └── page.tsx       # Audit log viewer
│   │   │       └── settings/
│   │   │           └── page.tsx       # System settings
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── me/route.ts        # GET current user + role
│   │       │   └── sync/route.ts      # POST sync Entra user to DB on first login
│   │       ├── employee/
│   │       │   ├── profile/route.ts
│   │       │   ├── projects/route.ts
│   │       │   ├── team/route.ts
│   │       │   ├── leaves/route.ts
│   │       │   └── leaves/[id]/route.ts
│   │       ├── leave/
│   │       │   ├── apply/route.ts
│   │       │   ├── cancel/[id]/route.ts
│   │       │   └── balance/route.ts
│   │       ├── manager/
│   │       │   ├── approvals/route.ts
│   │       │   ├── approvals/[id]/route.ts
│   │       │   ├── employees/route.ts
│   │       │   └── projects/route.ts
│   │       │   └── projects/[id]/route.ts
│   │       ├── hr/
│   │       │   ├── employees/route.ts
│   │       │   ├── employees/[id]/route.ts
│   │       │   ├── employees/onboard/route.ts
│   │       │   ├── employees/offboard/[id]/route.ts
│   │       │   ├── leaves/route.ts
│   │       │   ├── leaves/[id]/revoke/route.ts
│   │       │   ├── balance/adjust/route.ts
│   │       │   ├── rules/route.ts
│   │       │   └── reports/export/route.ts
│   │       ├── admin/
│   │       │   ├── users/route.ts
│   │       │   ├── audit/route.ts
│   │       │   └── settings/route.ts
│   │       ├── projects/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── notifications/
│   │       │   └── route.ts
│   │       └── accrual/
│   │           └── run/route.ts       # Trigger accrual manually (dev) or via cron
│   ├── components/
│   │   ├── ui/                        # shadcn/ui component overrides
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx    # Main shell with sidebar + header
│   │   │   ├── Sidebar.tsx            # Role-specific sidebar nav
│   │   │   ├── TopHeader.tsx          # Header: search, notifications, avatar
│   │   │   ├── NotificationBell.tsx   # Bell icon + dropdown
│   │   │   └── UserAvatar.tsx         # Avatar with dropdown menu
│   │   ├── leave/
│   │   │   ├── LeaveCalendar.tsx      # Interactive calendar for leave selection
│   │   │   ├── LeaveApplicationForm.tsx
│   │   │   ├── LeaveStatusBadge.tsx   # PENDING/APPROVED/REJECTED/CANCELLED/REVOKED
│   │   │   ├── LeaveBalanceCard.tsx   # Shows current balance breakdown
│   │   │   ├── LeaveSummaryTable.tsx
│   │   │   └── HalfDaySelector.tsx
│   │   ├── employee/
│   │   │   ├── EmployeeCard.tsx
│   │   │   ├── EmployeeTable.tsx
│   │   │   ├── AvailabilityBadge.tsx  # 🟢 Available / 🔴 On Leave / 🟡 Half Day
│   │   │   ├── ProjectTag.tsx
│   │   │   └── EmployeeProfileModal.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectMemberList.tsx
│   │   │   └── AllocateMembersModal.tsx
│   │   ├── approvals/
│   │   │   ├── ApprovalCard.tsx
│   │   │   ├── ApprovalDetailPane.tsx
│   │   │   └── ApprovalActionModal.tsx
│   │   ├── charts/
│   │   │   ├── LeaveDistributionChart.tsx
│   │   │   ├── MonthlyLeaveChart.tsx
│   │   │   └── DepartmentAvailabilityChart.tsx
│   │   └── shared/
│   │       ├── PageHeader.tsx
│   │       ├── DataTable.tsx          # Reusable table with sort/filter/pagination
│   │       ├── StatusChip.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       └── ErrorBoundary.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── msalConfig.ts          # MSAL configuration object
│   │   │   ├── msalInstance.ts        # Singleton MSAL instance
│   │   │   ├── getAccessToken.ts      # Silently acquire tokens
│   │   │   ├── validateToken.ts       # Backend JWT validation using jose
│   │   │   └── graphClient.ts         # Microsoft Graph client factory
│   │   ├── db/
│   │   │   ├── prisma.ts              # Singleton Prisma client
│   │   │   └── queries/               # Named query helpers (not raw SQL)
│   │   ├── leave/
│   │   │   ├── accrualEngine.ts       # Accrual calculation logic
│   │   │   ├── balanceService.ts      # Balance computation from ledger
│   │   │   ├── leaveValidator.ts      # Overlap, balance, date checks
│   │   │   └── ledgerService.ts       # postUsage, postReversal, postAccrual, postAdjustment
│   │   ├── email/
│   │   │   ├── graphMailer.ts         # sendMail via Microsoft Graph
│   │   │   └── templates/
│   │   │       ├── leaveApplied.ts
│   │   │       ├── leaveApproved.ts
│   │   │       ├── leaveRejected.ts
│   │   │       ├── leaveCancelled.ts
│   │   │       └── hrAction.ts
│   │   ├── notifications/
│   │   │   └── notificationService.ts
│   │   ├── audit/
│   │   │   └── auditLogger.ts
│   │   └── utils/
│   │       ├── dateUtils.ts
│   │       ├── formatters.ts
│   │       └── roleUtils.ts
│   ├── hooks/
│   │   ├── useCurrentUser.ts          # Returns current user + role from /api/auth/me
│   │   ├── useLeaveBalance.ts
│   │   ├── useNotifications.ts
│   │   ├── useTeamAvailability.ts
│   │   └── useProjects.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── employee.ts
│   │   ├── leave.ts
│   │   ├── project.ts
│   │   └── api.ts
│   ├── middleware.ts                  # Next.js middleware — protect routes, role checks
│   └── constants/
│       ├── roles.ts
│       ├── leaveStatus.ts
│       └── routes.ts
```

---

## 4. AUTHENTICATION & AUTHORIZATION (ENTRA ID + MSAL)

### 4.1 Azure Entra ID Setup (already done by user)
- Tenant: `Moonshine`
- 15 users pre-registered in Entra ID
- Groups in Entra ID:
  - `LMS_Employees` — 12 users
  - `LMS_Managers` — 1 user  
  - `LMS_HR` — 1 user
  - `LMS_Admins` — 1 user
- App Registration created with:
  - Redirect URI: `http://localhost:3000` (dev) + Azure App Service URL (prod)
  - Expose API: Yes (for backend validation)
  - API Permissions granted:
    - `User.Read` — read logged-in user's profile
    - `GroupMember.Read.All` — read group membership
    - `Mail.Send` — send emails via Outlook
    - `offline_access` — refresh tokens

### 4.2 MSAL Configuration (`src/lib/auth/msalConfig.ts`)
```typescript
// Configure MSAL with:
// - authority: `https://login.microsoftonline.com/{TENANT_ID}`
// - clientId: from AZURE_AD_CLIENT_ID env var
// - redirectUri: process.env.NEXTAUTH_URL or window.location.origin
// - cache: localStorage (sessionStorage for prod)
// - scopes: ['openid', 'profile', 'email', 'User.Read', 'GroupMember.Read.All', 'Mail.Send']
```

### 4.3 Login Flow
1. User visits `/` → middleware checks for MSAL session → redirects to `/login`
2. `/login` page: full-screen branded login page with "Sign in with Microsoft" button
3. MSAL triggers `loginRedirect()` to Entra ID sign-in page
4. On successful return to `/auth/callback`, MSAL processes tokens
5. Frontend calls `POST /api/auth/sync` — passes Bearer token
6. Backend validates token (signature, issuer, audience, expiry using `jose` + JWKS from `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys`)
7. Backend calls Microsoft Graph `GET /me/memberOf` to determine groups → maps to role
8. Backend upserts user in `Employee` table (links Entra `objectId` to internal `employeeId`)
9. Returns `{ role, employeeId, displayName, email, projects }` to frontend
10. Frontend stores role in React context + routes to `/employee`, `/manager`, `/hr`, or `/admin`

### 4.4 Route Protection
- **Middleware (`src/middleware.ts`)**: Intercepts all `/employee/*`, `/manager/*`, `/hr/*`, `/admin/*`, and `/api/*` routes. Validates Bearer token presence (does not fully validate — defers to API route handlers for full validation). Redirects unauthenticated users to `/login`.
- **API Route Middleware**: Every API route must call `validateToken(req)` which:
  - Extracts `Authorization: Bearer <token>` header
  - Validates against Entra JWKS endpoint
  - Returns `{ userId, role, email }` or throws 401
  - Checks that the user's role matches what the route allows (role guard per route)
- **Client-side Route Guards**: Each dashboard layout checks `useCurrentUser()` hook; if role doesn't match the current path prefix, redirects to the correct dashboard.

### 4.5 Token Refresh
- MSAL handles silent token refresh automatically via `acquireTokenSilent()`
- If silent refresh fails → `acquireTokenRedirect()` is called
- Access tokens passed in every API call as `Authorization: Bearer <token>`

---

## 5. DATABASE SCHEMA (PRISMA + POSTGRESQL)

Create `prisma/schema.prisma` with the following complete schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

enum Role {
  EMPLOYEE
  MANAGER
  HR
  ADMIN
}

enum EmploymentStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
  TERMINATED
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  REVOKED       // HR/Admin forced revoke after leave started
}

enum HalfDayType {
  NONE
  FIRST_HALF    // Morning (AM)
  SECOND_HALF   // Afternoon (PM)
}

enum LedgerEntryType {
  ACCRUAL       // Monthly accrual credit
  USAGE         // Leave approved — deduct
  REVERSAL      // HR revokes approved leave — credit back
  ADJUSTMENT    // HR manual balance change
  CARRY_FORWARD // Year-end carry-forward credit
  YEAR_RESET    // Year-end reset debit (if policy requires)
  EMERGENCY_GRANT // Annual emergency leave grant
}

enum NotificationType {
  LEAVE_APPLIED
  LEAVE_APPROVED
  LEAVE_REJECTED
  LEAVE_CANCELLED
  LEAVE_REVOKED
  BALANCE_ADJUSTED
  EMPLOYEE_ONBOARDED
  EMPLOYEE_OFFBOARDED
  PROJECT_ASSIGNED
  PROJECT_REMOVED
  SYSTEM
}

enum AuditAction {
  LEAVE_APPLY
  LEAVE_APPROVE
  LEAVE_REJECT
  LEAVE_CANCEL
  LEAVE_REVOKE
  BALANCE_ADJUST
  EMPLOYEE_ONBOARD
  EMPLOYEE_OFFBOARD
  EMPLOYEE_UPDATE
  PROJECT_CREATE
  PROJECT_UPDATE
  PROJECT_MEMBER_ADD
  PROJECT_MEMBER_REMOVE
  RULES_UPDATE
  ACCRUAL_RUN
}

// ─── MODELS ───────────────────────────────────────────────────────────────────

model Employee {
  id                String           @id @default(cuid())
  entraObjectId     String           @unique  // Azure AD object ID
  email             String           @unique
  displayName       String
  firstName         String
  lastName          String
  jobTitle          String?
  department        String?
  phoneNumber       String?
  profilePictureUrl String?
  role              Role             @default(EMPLOYEE)
  employmentStatus  EmploymentStatus @default(ACTIVE)
  managerId         String?
  manager           Employee?        @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates      Employee[]       @relation("ManagerSubordinates")
  joinDate          DateTime         @default(now())
  terminationDate   DateTime?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // Relations
  projectMemberships   EmployeeProject[]
  leaveRequests        LeaveRequest[]   @relation("EmployeeLeaveRequests")
  approvedLeaves       LeaveRequest[]   @relation("ApproverLeaveRequests")
  leaveLedgerEntries   LeaveLedgerEntry[]
  sentNotifications    Notification[]   @relation("NotificationSender")
  receivedNotifications Notification[]  @relation("NotificationRecipient")
  auditLogsPerformed   AuditLog[]       @relation("AuditPerformer")
  auditLogsTargeted    AuditLog[]       @relation("AuditTarget")
  leaveBalance         LeaveBalance?

  @@map("employees")
}

model Project {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique  // Short code e.g. "PROJ-001"
  description String?
  color       String   @default("#6366f1")  // Hex color for project tag
  isActive    Boolean  @default(true)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     EmployeeProject[]

  @@map("projects")
}

model EmployeeProject {
  id         String   @id @default(cuid())
  employeeId String
  projectId  String
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignedAt DateTime @default(now())
  removedAt  DateTime?
  isActive   Boolean  @default(true)

  @@unique([employeeId, projectId])
  @@map("employee_projects")
}

model LeaveRequest {
  id            String      @id @default(cuid())
  employeeId    String
  employee      Employee    @relation("EmployeeLeaveRequests", fields: [employeeId], references: [id])
  
  startDate     DateTime
  endDate       DateTime
  startHalfDay  HalfDayType @default(NONE)  // If start date is half day
  endHalfDay    HalfDayType @default(NONE)  // If end date is half day
  totalDays     Float                        // Computed: 1 per full day, 0.5 per half day
  
  reason        String
  status        LeaveStatus @default(PENDING)
  
  approverId    String?
  approver      Employee?   @relation("ApproverLeaveRequests", fields: [approverId], references: [id])
  approvedAt    DateTime?
  rejectedAt    DateTime?
  rejectionReason String?
  revokedAt     DateTime?
  revokedBy     String?     // Employee ID of HR/Admin who revoked
  revocationReason String?
  cancelledAt   DateTime?
  
  emailsSent    Json?       // Track which emails have been sent: { applied: bool, approved: bool, ... }
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@map("leave_requests")
}

model LeaveBalance {
  id                  String   @id @default(cuid())
  employeeId          String   @unique
  employee            Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  year                Int      @default(dbgenerated("EXTRACT(YEAR FROM NOW())::int"))
  
  // Standard leave
  standardTotal       Float    @default(18)     // Annual entitlement
  standardAccrued     Float    @default(0)      // Accrued so far this year
  standardUsed        Float    @default(0)      // Used (approved) this year
  standardCarryForward Float   @default(0)      // Carried from previous year
  
  // Emergency leave
  emergencyTotal      Float    @default(2)
  emergencyUsed       Float    @default(0)
  
  // Computed balance: standardAccrued + standardCarryForward - standardUsed
  // Emergency: emergencyTotal - emergencyUsed
  
  updatedAt           DateTime @updatedAt

  @@map("leave_balances")
}

model LeaveLedgerEntry {
  id          String          @id @default(cuid())
  employeeId  String
  employee    Employee        @relation(fields: [employeeId], references: [id])
  type        LedgerEntryType
  days        Float           // Positive = credit, negative = debit
  reason      String
  referenceId String?         // LeaveRequest ID if applicable
  performedBy String?         // Employee ID of HR/Admin if manual action
  year        Int
  month       Int?
  createdAt   DateTime        @default(now())

  @@map("leave_ledger_entries")
}

model AccrualRule {
  id                   String   @id @default(cuid())
  name                 String   @default("Default Accrual Rule")
  standardLeavesPerYear Float   @default(18)
  emergencyLeavesPerYear Float  @default(2)
  accrualMethod        String   @default("MONTHLY")  // MONTHLY | ANNUAL
  daysPerMonth         Float    @default(1.5)
  carryForwardEnabled  Boolean  @default(true)
  carryForwardMaxDays  Float    @default(10)
  isActive             Boolean  @default(true)
  effectiveFrom        DateTime @default(now())
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@map("accrual_rules")
}

model Notification {
  id          String           @id @default(cuid())
  type        NotificationType
  title       String
  message     String
  recipientId String
  recipient   Employee         @relation("NotificationRecipient", fields: [recipientId], references: [id])
  senderId    String?
  sender      Employee?        @relation("NotificationSender", fields: [senderId], references: [id])
  referenceId String?          // LeaveRequest ID, Employee ID, etc.
  isRead      Boolean          @default(false)
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  @@map("notifications")
}

model AuditLog {
  id          String      @id @default(cuid())
  action      AuditAction
  performedBy String
  performer   Employee    @relation("AuditPerformer", fields: [performedBy], references: [id])
  targetId    String?
  target      Employee?   @relation("AuditTarget", fields: [targetId], references: [id])
  details     Json        // { before: {}, after: {}, params: {} }
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  @@map("audit_logs")
}

model SystemSettings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  updatedBy   String?
  updatedAt   DateTime @updatedAt

  @@map("system_settings")
}
```

### Seed Script (`prisma/seed.ts`)
- Create the one Manager, one HR, one Admin, and 12 Employee records in DB
- Link each to their Entra `objectId` values (use placeholder values during seeding, to be updated post-login via `/api/auth/sync`)
- Create 3–4 sample projects and assign employees to them
- Seed the default `AccrualRule`
- Seed initial `LeaveBalance` for all employees
- Seed a few sample `LeaveRequest` entries in various states (PENDING, APPROVED, REJECTED)
- Seed `LeaveLedgerEntry` records consistent with those requests

---

## 6. ROLE SYSTEM & ROUTING

### Role Hierarchy & Permissions Matrix
| Feature | Employee | Manager | HR | Admin |
|---------|----------|---------|-----|-------|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| View employee list | ❌ | ✅ (read) | ✅ (edit) | ✅ (edit) |
| View employee profile | ❌ | ✅ (team only) | ✅ (all) | ✅ (all) |
| Apply leave | ✅ | ✅ | ✅ | ✅ |
| Cancel own leave (before start) | ✅ | ✅ | ✅ | ✅ |
| Approve/reject leave | ❌ | ✅ (team only) | ❌ | ✅ |
| Revoke approved leave | ❌ | ❌ | ✅ | ✅ |
| View all leaves | ❌ | ✅ (team) | ✅ (all) | ✅ (all) |
| View projects | ✅ (own) | ✅ (all) | ✅ (all) | ✅ (all) |
| Manage projects | ❌ | ✅ | ❌ | ✅ |
| Allocate project members | ❌ | ✅ | ❌ | ✅ |
| Onboard/offboard employee | ❌ | ❌ | ✅ | ✅ |
| Adjust leave balance | ❌ | ❌ | ✅ | ✅ |
| Configure accrual rules | ❌ | ❌ | ✅ | ✅ |
| Export reports | ❌ | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ |
| Manage system settings | ❌ | ❌ | ❌ | ✅ |

### Route Map
```
/                    → redirects to /login (unauthenticated) or /[role]/dashboard
/login               → Microsoft SSO login page
/auth/callback       → MSAL redirect handler
/unauthorized        → 403 page

/employee/projects        → My Projects
/employee/apply-leave     → Apply Leave (calendar)
/employee/my-leaves       → My Leave History
/employee/my-team         → My Team Availability

/manager/dashboard        → Manager Home
/manager/approvals        → Pending Approvals Queue
/manager/approvals/[id]   → Single Approval Detail
/manager/employees        → View All Employees
/manager/projects         → View + Manage Projects
/manager/projects/[id]    → Project Detail + Member Allocation

/hr/dashboard             → HR Home
/hr/employees             → Employee Directory (full edit)
/hr/employees/[id]        → Employee Profile + Edit
/hr/lifecycle             → Onboard / Offboard
/hr/leaves                → All Leaves View
/hr/leaves/[id]           → Leave Detail + Revoke
/hr/reports               → Export Reports
/hr/rules                 → Accrual Rules Config

/admin/dashboard          → Admin Home
/admin/users              → All Entra Users
/admin/employees          → Full Employee Management
/admin/leaves             → All Leaves + Override
/admin/projects           → Project Management
/admin/audit              → Audit Log Viewer
/admin/settings           → System Settings
```

---

## 7. UI DESIGN SYSTEM & ANIMATIONS

### 7.1 Color Palette
```
Primary:       #0F172A (Slate-900 — deep professional navy/black)
Secondary:     #1E293B (Slate-800)
Surface:       #FFFFFF (white)
Background:    #F8FAFC (Slate-50 — very light off-white)
Border:        #E2E8F0 (Slate-200)
Text Primary:  #0F172A
Text Secondary: #64748B (Slate-500)
Text Muted:    #94A3B8 (Slate-400)

Accent Green:  #16A34A (success, available, approved)
Accent Red:    #DC2626 (error, on-leave, rejected, danger)
Accent Amber:  #D97706 (warning, pending, half-day)
Accent Blue:   #2563EB (info, links, active nav)
Accent Purple: #7C3AED (projects, allocations)

Sidebar BG:    #0F172A (deep dark sidebar)
Sidebar Text:  #CBD5E1 (Slate-300)
Sidebar Active: #FFFFFF with left border accent #2563EB
```

### 7.2 Typography
```
Font Family: Inter (Google Fonts) — import in globals.css
Headings: font-weight: 700
Body: font-weight: 400
Labels: font-weight: 500, uppercase, letter-spacing: 0.05em
Font sizes: 12 / 14 / 16 / 18 / 24 / 30 / 36 / 48px
```

### 7.3 Component Styles
```
Cards:
  - bg-white rounded-xl border border-slate-200 shadow-sm
  - hover: shadow-md transition-shadow duration-200
  - padding: p-6

Buttons:
  Primary: bg-slate-900 text-white rounded-lg px-4 py-2 hover:bg-slate-800
  Secondary: bg-white text-slate-900 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50
  Danger: bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700
  Success: bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700
  Ghost: text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-3 py-2
  All buttons: transition-all duration-150 font-medium text-sm

Status Badges (LeaveStatus):
  PENDING:   bg-amber-50 text-amber-700 border border-amber-200
  APPROVED:  bg-green-50 text-green-700 border border-green-200
  REJECTED:  bg-red-50 text-red-700 border border-red-200
  CANCELLED: bg-slate-100 text-slate-600 border border-slate-200
  REVOKED:   bg-purple-50 text-purple-700 border border-purple-200

Availability Badges:
  Available:  🟢 bg-green-50 text-green-700 — "Available"
  On Leave:   🔴 bg-red-50 text-red-700 — "On Leave"
  Half Day:   🟡 bg-amber-50 text-amber-700 — "Half Day"

Input Fields:
  border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white

Tables:
  Header: bg-slate-50 text-slate-500 uppercase text-xs tracking-wider
  Rows: hover:bg-slate-50 border-b border-slate-100
  Clickable rows: cursor-pointer

Sidebar:
  width: 260px
  bg: #0F172A
  Active item: white text + 3px left border in blue + slightly lighter background
  Hover: bg-slate-800
  Icons: 20px, inline before nav text
  Section headers: slate-400, uppercase, text-xs, tracking-wider
```

### 7.4 Animations (Framer Motion)
Implement ALL of the following animations:

```typescript
// 1. Page entrance — each dashboard page
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}
// transition: { duration: 0.3, ease: "easeOut" }

// 2. Stagger children — lists of cards/rows
const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } }
}
const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 }
}

// 3. Stats counter — number counts up from 0 to value on mount
// Use useEffect with requestAnimationFrame or framer-motion's useMotionValue + useSpring

// 4. Sidebar nav item hover — subtle translateX(4px)

// 5. Notification bell — shake animation when new notification arrives
// keyframes: rotate(-10deg) → rotate(10deg) → 0 → loop 2x

// 6. Approval card — slide in from right on detail pane open
const detailPaneVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 }
}

// 7. Status badge — scale pop when status changes
// scale: 0.8 → 1.05 → 1.0

// 8. Calendar date selection — ripple effect on selected dates

// 9. Modal open/close — scale + fade
const modalVariants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 }
}

// 10. Toast notifications — slide in from top-right, slide out

// 11. Leave balance progress bars — animate width from 0 to value on mount

// 12. Sidebar collapse/expand — animate width: 260px ↔ 72px (icon-only mode)
```

### 7.5 Sidebar Design
```
Width: 260px (expanded), 72px (collapsed — icon only, toggle with hamburger)
Top: Logo area — "Moonshine LMS" wordmark + small icon
Middle: Role-specific navigation items (with Lucide icons)
Bottom: Current user mini-card (avatar, name, role badge)

Navigation structure per role:

EMPLOYEE:
  📁 My Projects
  📅 Apply Leave
  👥 My Team
  📋 My Leaves

MANAGER:
  🏠 Dashboard
  ✅ Approvals (with pending count badge)
  👥 Employees
  📁 Projects
  🔔 Notifications

HR:
  🏠 Dashboard
  👤 Employees
  🔄 Lifecycle
  📋 All Leaves
  📊 Reports
  ⚙️ Rules

ADMIN:
  🏠 Dashboard
  👤 Employees
  📋 Leaves
  📁 Projects
  👥 Users
  📜 Audit Log
  ⚙️ Settings
```

---

## 8. SHARED LAYOUT & NAVIGATION

### `DashboardLayout.tsx`
- Renders sidebar (role-specific) + top header + `{children}`
- Sidebar is sticky and full-height
- Main content area is scrollable with `overflow-y-auto`
- Responsive: sidebar collapses to bottom nav on mobile (or hamburger overlay)

### `TopHeader.tsx`
```
Left:   Hamburger menu (toggle sidebar collapse) | Page title (dynamic, from route)
Right:  [Search icon] [Notification Bell] [Divider] [User Avatar]
```
- **Search**: global search bar (opens cmd+k modal) — searches employees, projects, leaves
- **Notification Bell**: badge with unread count; clicking opens dropdown of last 10 notifications with "Mark all as read" button
- **User Avatar**: displays user profile photo from Entra (or initials fallback); clicking opens dropdown:
  - User name + role badge
  - "My Profile" link → opens profile modal
  - "Sign Out" button → MSAL logout + clear session

### Global Search (Cmd+K)
- Keyboard shortcut `Cmd+K` / `Ctrl+K` opens a full-screen modal search
- Searches across: employees (by name, email), projects (by name), leave requests (by employee name or status)
- Results grouped by category with icons
- Role-filtered: employees see less than HR/Admin

---

## 9. EMPLOYEE DASHBOARD

### 9.1 My Projects (`/employee/projects`)
**Purpose**: Show all projects the employee is assigned to, along with teammate availability.

**UI Layout**:
- Page header: "My Projects" with project count badge
- Project cards in a 2-column grid:
  - Card header: Project name, code badge, colored tag, active status indicator
  - "Your role on this project" tag
  - Team members section:
    - Avatar + name + job title for each member
    - Availability badge for TODAY: 🟢 Available / 🔴 On Leave / 🟡 Half Day
    - Tooltip on badge: shows leave dates if on leave
  - "Team Coverage" mini bar: shows X/Y members available today
  - "View full team calendar" link
- If no projects assigned: empty state with icon + "You haven't been assigned to any projects yet. Contact your manager."

**API**: `GET /api/employee/projects`
- Returns: `Project[]` with each project having `members: EmployeeWithAvailability[]`
- Availability computed by checking `LeaveRequest` where `status = APPROVED AND startDate <= today AND endDate >= today`

### 9.2 Apply Leave (`/employee/apply-leave`)
**Purpose**: Submit a new leave request.

**UI Layout** (2-panel layout):
- LEFT PANEL (60%): Interactive calendar
  - Full month view calendar (`react-day-picker`)
  - Color coding on calendar:
    - Green highlight: available days
    - Red highlight: already on approved leave
    - Amber highlight: pending leave requests
    - Gray: weekends
  - Click to select start date → then click to select end date (range selection)
  - Selected range highlighted in blue
  - Below calendar: duration summary "Selected: 3 days (May 15 – May 17)"

- RIGHT PANEL (40%): Form
  - Selected dates summary (editable)
  - Half-day options (if single day or for start/end days):
    - Checkbox: "First half of start date only" (0.5 days)
    - Checkbox: "Second half of end date only" (0.5 days)
    - Both checkboxes can be selected independently
  - Duration auto-calculated and displayed: "Total: 2.5 days"
  - Reason textarea (required, min 10 chars, max 500 chars)
  - ⚠️ Project Awareness Warning box (if teammates on same project are also on leave during selected dates):
    - "Warning: 2 team members from Project Alpha are also on leave during this period"
    - Non-blocking, dismissible
  - Balance Preview card:
    - Current balance: X days
    - Requesting: Y days
    - Remaining after approval: Z days (shown in red if would go to 0 or negative)
  - Submit button: "Submit Leave Request" (disabled if validation fails)
  - Validation errors shown inline under relevant fields

**Validation logic** (client-side + server-side):
1. `startDate <= endDate`
2. No past dates (startDate >= today)
3. No overlap with existing PENDING or APPROVED leaves
4. Available balance >= requested days (warn for emergency if > 2)
5. Start and end dates cannot be weekends (business days only)

### 9.3 My Leaves (`/employee/my-leaves`)
**Purpose**: History of all submitted leaves with status and cancellation option.

**UI Layout**:
- Top: Leave Balance Card (always visible)
  ```
  ┌────────────────────────────────────────────────┐
  │  Leave Balance 2025                             │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
  │  │ Available│  │ Used     │  │ Pending  │     │
  │  │  14.5    │  │  3.5     │  │  0       │     │
  │  │  days    │  │  days    │  │  days    │     │
  │  └──────────┘  └──────────┘  └──────────┘     │
  │  Emergency: 2 remaining / 2 total               │
  │  Carry-forward: 5 days from 2024                │
  │  [Animated progress bar showing usage]          │
  └────────────────────────────────────────────────┘
  ```
- Tabs: All | Pending | Approved | Rejected | Cancelled
- Leave history table:
  - Columns: Dates | Duration | Reason (truncated) | Status Badge | Submitted | Actions
  - Actions column:
    - If `status = PENDING` and `startDate > today`: [Cancel] button
    - If `status = APPROVED` and `startDate > today`: [Cancel] button (with confirmation dialog)
    - If `status = APPROVED` and `startDate <= today`: "Cannot cancel — contact HR" tooltip
  - Clicking a row expands it to show full reason, approver name, approval date, rejection reason if rejected

### 9.4 My Team (`/employee/my-team`)
**Purpose**: View all teammates' current availability.

**UI Layout**:
- Filter bar: "Today" | "This Week" | "This Month" | Custom date range
- Team member cards OR table toggle:
  - Card view: Avatar, Name, Job Title, Availability Badge, "On leave until [date]" if applicable, Project tags
  - Table view: Name | Department | Status | Leave Period | Projects
- Visual calendar at top showing team leave overview for the week (mini heat-map: columns = days, rows = people, color = availability)
- Empty state: "Your team members will appear here once you're assigned to a project."

---

## 10. MANAGER DASHBOARD

### 10.1 Manager Home (`/manager/dashboard`)
**UI Layout**:
- Welcome section: "Good morning, [Name] 👋" with today's date
- Stats row (animated counters):
  - Pending Approvals (clickable → approvals page)
  - Team Size
  - On Leave Today
  - Leaves This Month
- Quick Actions: [Review Approvals] [View Projects] [Team Calendar]
- Recent Activity feed (last 10 events: leaves submitted, approved, rejected)
- Mini team availability widget (today)

### 10.2 Approvals (`/manager/approvals`)
**Purpose**: Review and act on all PENDING leave requests from the manager's team.

**UI Layout** (master-detail split):
- LEFT: Approval Queue
  - Filter tabs: All Pending | Today's | This Week's
  - Each item:
    - Employee avatar + name
    - Leave dates + duration
    - Submitted date
    - Days since submission ("2 days ago")
    - Status badge: PENDING (amber)
  - Sort: By submission date (newest first) or by leave start date
  - Search by employee name

- RIGHT (detail pane, opens on click, animates in from right):
  - Employee card: photo, name, email, department, job title
  - Leave details:
    - Start date → End date (with half-day details)
    - Total days
    - Reason (full text)
  - Leave balance info: current balance, pending balance after approval
  - **⚠️ Team Conflict Warning**: "2 other team members are on leave during this period: [Name1, Name2]"
  - **Project context**: Shows which projects this employee is on and who else is off from those projects
  - Action buttons:
    - [✅ Approve] (green) — immediate action with confirmation
    - [❌ Reject] (red) — opens rejection reason dialog (required input)
  - Both actions disabled if already processed

**Approve flow**: 
1. Click Approve → Confirmation dialog: "Approve leave for [Name] from [dates]?"
2. On confirm: `PATCH /api/manager/approvals/[id]` with `{ action: "approve" }`
3. Server: updates status → APPROVED, creates USAGE ledger entry, sends email
4. Toast: "Leave approved successfully"
5. Card removed from pending queue with slide-out animation

**Reject flow**:
1. Click Reject → Dialog with required text input: "Reason for rejection (required)"
2. On confirm: `PATCH /api/manager/approvals/[id]` with `{ action: "reject", reason: "..." }`
3. Server: updates status → REJECTED (no ledger change), sends email
4. Toast: "Leave rejected"

### 10.3 View All Employees (`/manager/employees`)
- Read-only table of all active employees
- Columns: Photo | Name | Job Title | Department | Status (availability today) | Projects | Leave Balance
- Clickable row → read-only employee profile modal (no edit access)
- Filter by: Department | Project | Availability Today | Search by name/email

### 10.4 Projects (`/manager/projects`)
**Purpose**: Manage projects and allocate employees to them.

**UI Layout**:
- Top: [+ New Project] button (opens create project modal)
- Project cards grid:
  - Project name + code badge
  - Color indicator
  - Member count + [View Members]
  - Edit project details button
  - Status: Active / Inactive

**Project Detail (`/manager/projects/[id]`)**:
- Project header: name, code, description, date range, active status toggle
- Members section:
  - Current members list with availability today + [Remove] button per member
  - [+ Add Member] button → opens employee search modal (searchable list of all active employees not already in project) → select → assign
- Activity section: recent leave events within this project's team

---

## 11. HR DASHBOARD

### 11.1 HR Home (`/hr/dashboard`)
**UI Layout**:
- Organization stats cards:
  - Total Active Employees
  - On Leave Today
  - Pending Approvals (across all managers)
  - New Joiners This Month
  - Leaves This Month
  - Available Today %
- Recharts charts section:
  - Monthly leave trend (bar chart — last 6 months)
  - Leave status distribution (donut chart — pending/approved/rejected)
  - Department availability (horizontal bar chart)
- "Recent HR Actions" activity log (last 10 audit entries for HR actions)
- Today's leave calendar snippet (who's off today)

### 11.2 Employees (`/hr/employees` + `/hr/employees/[id]`)
**Purpose**: Full employee directory with edit access.

**List view**:
- Table with all employees (active + inactive toggle)
- Columns: Avatar | Name | Email | Job Title | Department | Manager | Role Badge | Status | Join Date | Actions
- Actions: [View] [Edit] [Offboard]
- Filters: Role | Department | Employment Status | Search
- [+ Onboard New Employee] button → goes to `/hr/lifecycle`

**Employee Profile (`/hr/employees/[id]`)**:
- Full profile card (all fields from Employee model)
- Edit mode toggle → edit any field in-place
- Leave balance section (editable by HR: adjust balance with reason)
- Leave history table (all leaves for this employee)
- Project assignments with add/remove
- [Offboard Employee] danger button (with confirmation + reason input)
- Audit trail section: HR actions taken on this employee

### 11.3 Employee Lifecycle (`/hr/lifecycle`)
**Purpose**: Onboard new employees and offboard departing ones.

**ONBOARD tab**:
- Step-by-step form:
  1. Personal Information: First Name, Last Name, Email, Phone, Job Title, Department
  2. System Setup: Role (Employee/Manager/HR/Admin), Manager assignment, Start Date
  3. Project Assignment: Multi-select projects to initially assign
  4. Leave Initialization: Standard balance grant, carry-forward from previous system (if any)
- On submit: Creates Employee record in DB + sends welcome email via Outlook + creates initial LeaveLedgerEntry for annual grant

**OFFBOARD tab**:
- Search employee by name or email
- Shows employee card with current pending leaves warning: "This employee has 1 pending leave request that will be cancelled"
- Termination date input
- Reason input
- Checkboxes: "Cancel all pending leave requests" | "Notify manager" | "Notify HR team"
- [Confirm Offboard] danger button → sets `employmentStatus = TERMINATED`, cancels pending leaves, sends notifications

### 11.4 All Leaves (`/hr/leaves` + `/hr/leaves/[id]`)
**Purpose**: View, filter, and act on all leave requests system-wide.

**List view**:
- Filters: Employee name | Status | Date range | Department | Project
- Table: Employee | Dates | Days | Reason | Status | Manager | Submitted | Actions
- Export button: [Export to CSV] [Export to Excel]
- Clicking a row → leave detail page

**Leave Detail (`/hr/leaves/[id]`)**:
- Full leave details: employee info, dates, reason, status history timeline
- Current status + who approved/rejected and when
- Email chain summary (which emails were sent)
- HR Actions panel:
  - If `status = APPROVED` (including after start date): [Revoke Leave] button → opens dialog: requires "Revocation Reason" + confirmation → sets status = REVOKED, creates REVERSAL ledger entry, sends email to employee + manager
  - If `status = PENDING`: HR can also approve or reject (override)
  - If `status = REJECTED/CANCELLED/REVOKED`: No actions, just view

### 11.5 Reports (`/hr/reports`)
**Purpose**: Export reports for HR analysis and compliance.

**Report Types** (each has filter options + [Generate] button):
1. **Leave Summary Report**: All leaves in date range — employee, dates, days, status, reason
2. **Leave Balance Report**: All employees — standard balance, emergency balance, used, pending, available
3. **Employee Directory**: All employees with contact info, manager, department, projects, join date
4. **Attendance Overview**: Who was on leave each day — useful for payroll
5. **Project Availability Report**: For each project, who was available/on leave in date range

**Export formats**: CSV (via `csv-stringify`) and Excel (via `xlsx` library)

### 11.6 Rules (`/hr/rules`)
**Purpose**: Configure the leave accrual and carry-forward policy.

**Form fields**:
- Standard Leaves Per Year (default: 18)
- Emergency Leaves Per Year (default: 2)
- Accrual Method: Monthly | Annual
- Days Per Month Accrual (default: 1.5, only visible if Monthly)
- Carry-Forward Enabled: toggle
- Maximum Carry-Forward Days (default: 10, only visible if carry-forward enabled)
- Effective From date

**Warning banner**: "Changing these rules affects ALL employees from the effective date. A re-calculation of balances may be needed."

**Save + Audit**: On save, creates AuditLog entry with before/after values.

---

## 12. ADMIN DASHBOARD

### 12.1 Admin Home (`/admin/dashboard`)
- Everything from HR dashboard PLUS:
- System health stats: DB connection status, last accrual run timestamp, pending emails count
- Quick action tiles: Manage Users | Run Accrual | View Audit Log | System Settings

### 12.2 Users (`/admin/users`)
- Lists all 15 Entra users (fetched via Microsoft Graph `GET /users`)
- Shows: Display Name | Email | Entra Object ID | Synced to DB (yes/no) | Role in DB
- [Sync User] button per user who isn't yet in DB
- [Change Role] button per user → changes role in DB + group membership guidance

### 12.3 All Leaves + Override (`/admin/leaves`)
- Same as HR leaves view + ability to:
  - Force-approve any PENDING leave (bypasses manager)
  - Force-reject any PENDING leave
  - Revoke any APPROVED leave (same as HR)
  - Adjust balance for any employee

### 12.4 Projects (`/admin/projects`)
- Full CRUD for projects
- [+ New Project], [Edit], [Delete/Deactivate] per project
- Allocate/remove members from any project

### 12.5 Audit Log (`/admin/audit`)
- Full paginated audit log table
- Columns: Timestamp | Action | Performed By | Target Employee | Details (expandable)
- Filters: Date range | Action type | Performed By
- Expand row: shows before/after JSON diff for data changes

### 12.6 Settings (`/admin/settings`)
- System-wide settings:
  - Company Name
  - Logo URL
  - Default timezone
  - Leave application cutoff (how many days in advance minimum)
  - Working days per week (Mon–Fri default)
  - Business days calendar (public holidays to exclude)
  - Email sender address (no-reply@moonshine.onmicrosoft.com)
  - Enable/disable in-app notifications
  - Enable/disable email notifications

---

## 13. LEAVE ENGINE & ACCRUAL SYSTEM

### 13.1 Accrual System
```typescript
// src/lib/leave/accrualEngine.ts

// Monthly accrual (run on 1st of each month via cron or manual trigger):
// For each ACTIVE employee:
//   daysToAccrue = rule.daysPerMonth (default 1.5)
//   Create LeaveLedgerEntry: { type: ACCRUAL, days: +1.5, year: currentYear, month: currentMonth }
//   Update LeaveBalance.standardAccrued += 1.5

// Year-end processing (run on Jan 1):
//   For each ACTIVE employee:
//     carryForward = min(unusedBalance, rule.carryForwardMaxDays)
//     Create new LeaveBalance record for new year
//     Create LeaveLedgerEntry: { type: CARRY_FORWARD, days: +carryForward }
//     Create LeaveLedgerEntry: { type: EMERGENCY_GRANT, days: +rule.emergencyLeavesPerYear }
```

### 13.2 Balance Computation
```typescript
// src/lib/leave/balanceService.ts

// getBalance(employeeId: string, year: number): LeaveBalanceSummary
// Reads from LeaveBalance table (cached) + computes:
//   availableStandard = standardAccrued + standardCarryForward - standardUsed
//   availableEmergency = emergencyTotal - emergencyUsed
//   pendingDays = sum of PENDING leave requests for this year
//   effectiveAvailable = availableStandard - pendingDays (for display purposes)
```

### 13.3 Ledger Entries
All balance changes MUST go through ledger entries (immutable audit trail):
- `USAGE`: Created when manager APPROVES leave — `days = -totalDays`
- `REVERSAL`: Created when HR/Admin REVOKES approved leave — `days = +totalDays`
- `ADJUSTMENT`: HR manual adjustment — `days = ± amount` with reason
- `ACCRUAL`: Monthly accrual job — `days = +1.5`
- `CARRY_FORWARD`: Year-end — `days = +carryForwardAmount`
- `EMERGENCY_GRANT`: Year-start — `days = +2`

### 13.4 Half-Day Logic
```typescript
function computeTotalDays(
  startDate: Date,
  endDate: Date,
  startHalfDay: HalfDayType,
  endHalfDay: HalfDayType
): number {
  // Count business days between startDate and endDate (inclusive)
  let businessDays = countBusinessDays(startDate, endDate); // excludes weekends
  
  // Subtract 0.5 if start day is half-day
  if (startHalfDay !== 'NONE') businessDays -= 0.5;
  
  // Subtract 0.5 if end day is half-day (and end != start to avoid double-counting)
  if (endHalfDay !== 'NONE' && startDate.getTime() !== endDate.getTime()) {
    businessDays -= 0.5;
  }
  
  return businessDays;
}
```

---

## 14. PROJECT & AVAILABILITY SYSTEM

### 14.1 Project Tags
- Each employee can be in multiple projects (M-to-M via `EmployeeProject`)
- Projects have colored tags displayed throughout the UI
- Project assignment: Manager (for their team) or Admin/HR can assign
- When allocating a member, show their current leave calendar to check conflicts

### 14.2 Availability Computation
```typescript
// For a given date (or date range), for a given employee:
function getAvailabilityStatus(
  employeeId: string,
  date: Date
): 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM'

// Check LeaveRequest table:
// - status = APPROVED
// - startDate <= date <= endDate
// If match found:
//   - If date = startDate and startHalfDay != NONE → HALF_DAY
//   - If date = endDate and endHalfDay != NONE → HALF_DAY
//   - Otherwise → ON_LEAVE
// If no match → AVAILABLE
```

### 14.3 On-Leave Visual Indicator
- On the Employee List (for manager/HR), each row shows today's availability badge
- On Team page, each member's card shows availability badge
- On Project page, each member shows availability
- When an employee's approved leave starts, their status changes automatically (no manual action needed — computed in real-time from DB)

### 14.4 Project Conflict Warning (on Leave Apply)
- When employee selects leave dates, system checks all projects the employee is on
- For each project, fetches approved+pending leaves of other members in that date range
- If 2+ people from same project are on leave → warning shown (not blocking)

---

## 15. EMAIL NOTIFICATION SYSTEM (MICROSOFT GRAPH + OUTLOOK)

### 15.1 Email Events & Recipients
| Event | To | CC | Subject |
|-------|----|----|---------|
| Leave Applied (PENDING) | Manager | HR | `[Leave Request] {Name} has applied for leave ({dates})` |
| Leave Approved | Employee | HR | `[Leave Approved] Your leave request has been approved ({dates})` |
| Leave Rejected | Employee | — | `[Leave Rejected] Your leave request has been rejected ({dates})` |
| Leave Cancelled by Employee | Manager | HR | `[Leave Cancelled] {Name} has cancelled their leave request ({dates})` |
| Leave Revoked by HR/Admin | Employee | Manager | `[Leave Revoked] Your approved leave has been revoked ({dates})` |
| Balance Adjusted by HR | Employee | — | `[Balance Update] Your leave balance has been adjusted` |
| Employee Onboarded | Employee | Manager | `[Welcome] Your account on Moonshine LMS is ready` |
| Employee Offboarded | Manager | HR | `[Offboarding] {Name} has been offboarded from the system` |

### 15.2 Email Templates
Each email must be HTML-formatted (professional, matching app theme):
```html
<!-- Header: Moonshine LMS logo/wordmark, colored header bar -->
<!-- Body: Clean white card with relevant details -->
<!-- Details table: Employee name, dates, duration, reason (if applicable), status -->
<!-- CTA button: "View in Moonshine LMS" → deep link to relevant page -->
<!-- Footer: "This is an automated email from Moonshine LMS. Do not reply to this email." -->
```

### 15.3 Graph Mail Implementation
```typescript
// src/lib/email/graphMailer.ts

// Uses app-level access (client credentials flow — not delegated)
// App registration needs: Mail.Send application permission (not delegated)
// From address: configured in system settings (e.g. no-reply@moonshine.onmicrosoft.com)

async function sendMail({
  to: string[],
  cc?: string[],
  subject: string,
  htmlBody: string,
  saveToSentItems?: boolean // false for transactional
}): Promise<void>

// Uses: POST https://graph.microsoft.com/v1.0/users/{sender}/sendMail
// Auth: Bearer token from `client_credentials` grant
```

### 15.4 Email Tracking
- `LeaveRequest.emailsSent` JSON field tracks which emails were dispatched: `{ applied: true, approved: false, ... }`
- Prevents duplicate sends on retry
- Email send failures are logged to AuditLog but do NOT block the main operation (fire and forget with retry)

---

## 16. IN-APP NOTIFICATION SYSTEM

### 16.1 Notification Feed
- Bell icon in header with unread count badge (animated red dot)
- Click bell → dropdown showing last 10 notifications
- "Mark all as read" button
- "View all notifications" link (optional dedicated page)
- Auto-refresh: poll `/api/notifications` every 30 seconds (or use SSE for real-time)

### 16.2 Notification Triggers
- Leave request submitted → notify Manager + HR
- Leave approved → notify Employee
- Leave rejected → notify Employee
- Leave cancelled → notify Manager + HR
- Leave revoked → notify Employee + Manager
- Balance adjusted → notify Employee
- Assigned to project → notify Employee
- Removed from project → notify Employee
- Employee onboarded → notify Admin + HR
- Employee offboarded → notify Manager + Admin

### 16.3 Notification Item Design
```
🟡 [Avatar] [Name] has submitted a leave request for May 15–17
   2 minutes ago                                          [• unread dot]
```

---

## 17. AUDIT & LOGGING SYSTEM

### 17.1 What Gets Audited
Every state-changing operation:
- Leave: apply, approve, reject, cancel, revoke
- Employee: onboard, offboard, update profile, change role
- Balance: any manual adjustment
- Projects: create, update, assign member, remove member
- Rules: any accrual rule change
- Accrual: each run
- Settings: any system setting change

### 17.2 Audit Entry Structure
```typescript
{
  action: AuditAction,
  performedBy: string,     // Employee ID
  targetId?: string,       // Employee ID being acted on
  details: {
    before: {},            // State before action
    after: {},             // State after action
    params: {}             // Additional params (e.g. reason for rejection)
  },
  ipAddress: string,
  userAgent: string,
  createdAt: DateTime
}
```

### 17.3 Audit Logger
```typescript
// src/lib/audit/auditLogger.ts
// Call this after every successful state-changing operation
async function logAudit(
  action: AuditAction,
  performedById: string,
  targetId: string | null,
  details: object,
  req: NextRequest
): Promise<void>
```

---

## 18. BACKEND API ROUTES (FULL LIST)

All routes must:
1. Call `validateToken(req)` first — returns `{ userId, role, email }` or throws 401
2. Check role authorization — throw 403 if insufficient role
3. Write audit log for state-changing operations
4. Return consistent error format: `{ error: string, code: string }`

```
POST  /api/auth/sync                    — Sync Entra user to DB on first login
GET   /api/auth/me                      — Get current user + role + balance summary

GET   /api/employee/projects            — Get my projects + team availability
GET   /api/employee/team                — Get my teammates + their availability
GET   /api/employee/leaves              — Get my leave history
GET   /api/employee/profile             — Get my profile

POST  /api/leave/apply                  — Submit new leave request (Employee/Manager/HR/Admin)
POST  /api/leave/cancel/:id             — Cancel own leave (before start date only)
GET   /api/leave/balance                — Get my current leave balance

GET   /api/manager/approvals            — Get pending approvals for my team
PATCH /api/manager/approvals/:id        — Approve or reject a leave request
GET   /api/manager/employees            — Get all employees (read-only for manager)
GET   /api/manager/projects             — Get all projects
POST  /api/manager/projects             — Create new project
PATCH /api/manager/projects/:id         — Update project details
POST  /api/manager/projects/:id/members — Add member to project
DELETE /api/manager/projects/:id/members/:employeeId — Remove member from project

GET   /api/hr/employees                 — Get all employees (full data)
GET   /api/hr/employees/:id             — Get single employee full profile
PATCH /api/hr/employees/:id             — Update employee profile
POST  /api/hr/employees/onboard         — Onboard new employee
POST  /api/hr/employees/:id/offboard    — Offboard employee
GET   /api/hr/leaves                    — Get all leaves (filterable)
GET   /api/hr/leaves/:id                — Get single leave detail
PATCH /api/hr/leaves/:id/approve        — HR approve (override)
PATCH /api/hr/leaves/:id/reject         — HR reject (override)
POST  /api/hr/leaves/:id/revoke         — Revoke approved leave (HR/Admin only)
POST  /api/hr/balance/adjust            — Manually adjust employee leave balance
GET   /api/hr/rules                     — Get current accrual rules
PATCH /api/hr/rules                     — Update accrual rules
GET   /api/hr/reports/export            — Generate and return report file

GET   /api/admin/users                  — Get all Entra users (via Graph)
GET   /api/admin/audit                  — Get paginated audit log
PATCH /api/admin/settings               — Update system settings

GET   /api/notifications                — Get notifications for current user
PATCH /api/notifications/read           — Mark notifications as read
POST  /api/notifications/read-all       — Mark all as read

POST  /api/accrual/run                  — Manually trigger accrual (Admin only, dev use)
```

---

## 19. ENVIRONMENT VARIABLES & CONFIGURATION

### `.env.local` (local development)
```env
# Database
DATABASE_URL="postgresql://moonshine:moonshine@localhost:5432/moonshine_lms"

# Azure Entra ID / MSAL
NEXT_PUBLIC_AZURE_AD_CLIENT_ID="<your-client-id>"
NEXT_PUBLIC_AZURE_AD_TENANT_ID="<your-tenant-id>"
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI="http://localhost:3000"

# Backend API (for server-side token validation)
AZURE_AD_CLIENT_ID="<your-client-id>"
AZURE_AD_TENANT_ID="<your-tenant-id>"
AZURE_AD_CLIENT_SECRET="<your-client-secret>"  # For client_credentials flow (email sending)

# Microsoft Graph (email sending — app-level)
GRAPH_SENDER_EMAIL="no-reply@moonshine.onmicrosoft.com"

# App
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<random-32-char-string>"
NODE_ENV="development"

# Optional: Azure Application Insights (skip for local dev)
APPLICATIONINSIGHTS_CONNECTION_STRING=""
```

### `.env.example`
Copy of above with all values replaced by `<placeholder>`

---

## 20. LOCAL DEVELOPMENT SETUP

### `docker-compose.yml`
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: moonshine_postgres
    environment:
      POSTGRES_USER: moonshine
      POSTGRES_PASSWORD: moonshine
      POSTGRES_DB: moonshine_lms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: moonshine_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@moonshine.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Setup Instructions for README
```bash
# 1. Clone + install
git clone <repo>
cd moonshine-lms
npm install

# 2. Start PostgreSQL
docker-compose up -d

# 3. Set up environment
cp .env.example .env.local
# Fill in Azure AD credentials in .env.local

# 4. Database setup
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start dev server
npm run dev
# App runs at http://localhost:3000

# 6. pgAdmin at http://localhost:5050
# Login: admin@moonshine.local / admin
```

### `package.json` scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node --project tsconfig.json prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio"
  }
}
```

---

## 21. AZURE DEPLOYMENT CONFIGURATION

### Azure Services Required
1. **Azure App Service** (Node 20 LTS) — hosts the Next.js app
2. **Azure Database for PostgreSQL Flexible Server** — managed Postgres
3. **Azure Key Vault** — store secrets (client secret, DB connection string)
4. **Azure Application Insights** — monitoring

### `next.config.ts` (production)
```typescript
// output: 'standalone' for Docker-based App Service deployment
// Add proper environment variable mapping
// CORS headers for API routes
// Image domains for avatar URLs from Entra
```

### Deployment Steps (for README)
```bash
# Build
npm run build

# Deploy to Azure App Service via:
# Option A: GitHub Actions CI/CD pipeline
# Option B: Azure CLI: az webapp deploy
# Option C: Azure DevOps pipeline

# Migrate DB on first deploy:
npx prisma migrate deploy
```

---

## 22. SECURITY REQUIREMENTS

1. **Never expose secrets client-side**: All `AZURE_AD_CLIENT_SECRET` and `DATABASE_URL` are server-side only (not `NEXT_PUBLIC_`)
2. **CSRF protection**: Next.js API routes are CSRF-protected by default in App Router; use proper SameSite cookies
3. **Input validation**: All API routes validate request body using Zod schemas before processing
4. **SQL injection prevention**: Prisma ORM parameterizes all queries — never use raw SQL
5. **Role enforcement at API level**: Every API route validates role even if the UI hides the button
6. **Token validation on every request**: `validateToken()` called at the top of every protected route handler
7. **Rate limiting**: Add `express-rate-limit`-style middleware or use Next.js middleware for rate limiting on `/api/leave/apply` and `/api/auth/*`
8. **Sensitive data masking in logs**: Never log full JWT tokens, passwords, or PII in console/audit logs
9. **HTTPS only**: In production, enforce HTTPS via Azure App Service's built-in SSL
10. **Content Security Policy**: Add CSP headers in `next.config.ts`

---

## 23. BUILD PHASE CHECKLIST

Build in this exact order:

### Phase 0: Project Setup
- [ ] `npx create-next-app@latest moonshine-lms --typescript --tailwind --app --src-dir --eslint`
- [ ] Install all dependencies listed in tech stack
- [ ] Set up `docker-compose.yml` and start PostgreSQL
- [ ] Configure `prisma/schema.prisma` with full schema above
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Write and run `prisma/seed.ts`
- [ ] Verify DB connection and seed data in pgAdmin

### Phase 1: Auth + Role Routing
- [ ] Configure MSAL (`msalConfig.ts`, `msalInstance.ts`)
- [ ] Wrap root layout with MSAL Provider
- [ ] Build `/login` page with Microsoft SSO button
- [ ] Handle MSAL redirect at `/auth/callback`
- [ ] Implement `POST /api/auth/sync` — validate token + upsert user + fetch groups from Graph
- [ ] Implement `GET /api/auth/me`
- [ ] Implement `useCurrentUser()` hook
- [ ] Build `middleware.ts` for route protection
- [ ] Implement role-based routing after login
- [ ] Test: login works → correct dashboard rendered → API calls authenticated

### Phase 2: Global Layout + Navigation
- [ ] Build `DashboardLayout.tsx` with sidebar + header shell
- [ ] Build `Sidebar.tsx` with role-specific nav items + collapse animation
- [ ] Build `TopHeader.tsx` with search, bell, avatar
- [ ] Build `UserAvatar.tsx` dropdown (profile + logout)
- [ ] Create placeholder pages for all routes
- [ ] Apply design system tokens (colors, typography, spacing)
- [ ] Add Framer Motion page transitions

### Phase 3: Employee Modules
- [ ] Build Leave Calendar component (`react-day-picker`)
- [ ] Build `LeaveApplicationForm.tsx` with all validations
- [ ] Implement `POST /api/leave/apply`
- [ ] Build `LeaveBalanceCard.tsx` with animated progress bars
- [ ] Build My Leaves history table with cancel functionality
- [ ] Build My Projects page with team availability
- [ ] Build My Team page with availability badges
- [ ] Test: apply → pending shown → cancel works

### Phase 4: Manager Modules
- [ ] Build Manager dashboard with animated stat counters
- [ ] Build Approvals master-detail layout
- [ ] Implement `GET /api/manager/approvals` + `PATCH /api/manager/approvals/:id`
- [ ] Build approve/reject flows with dialogs
- [ ] Build employee read-only list view
- [ ] Build Projects management + member allocation
- [ ] Test: leave applied → manager receives notification → approve/reject works → email logged

### Phase 5: HR Modules
- [ ] Build HR dashboard with charts (Recharts)
- [ ] Build full employee directory with edit
- [ ] Build Employee Lifecycle (onboard/offboard forms)
- [ ] Build All Leaves view with filters
- [ ] Build Leave revocation flow
- [ ] Build Balance adjustment form
- [ ] Build Reports page + CSV/Excel export
- [ ] Build Rules configuration page

### Phase 6: Admin Modules
- [ ] Build Admin dashboard
- [ ] Build Users page (Graph integration)
- [ ] Build Audit Log viewer
- [ ] Build System Settings

### Phase 7: Accrual Engine
- [ ] Implement `ledgerService.ts` (postUsage, postReversal, etc.)
- [ ] Implement `balanceService.ts` (compute balance from ledger)
- [ ] Implement `accrualEngine.ts` (monthly accrual)
- [ ] Wire approval → USAGE ledger entry
- [ ] Wire HR revoke → REVERSAL ledger entry
- [ ] Wire HR adjust → ADJUSTMENT ledger entry
- [ ] Build `POST /api/accrual/run` (manually trigger for dev testing)

### Phase 8: Email System
- [ ] Configure app-level Graph auth (client_credentials)
- [ ] Implement `graphMailer.ts`
- [ ] Build all 5 email HTML templates
- [ ] Wire email triggers into: apply, approve, reject, cancel, revoke, onboard, offboard, adjust
- [ ] Test email delivery for each trigger

### Phase 9: Notifications + Audit + Polish
- [ ] Implement `notificationService.ts`
- [ ] Wire notification creation into all key events
- [ ] Build `NotificationBell.tsx` with dropdown + auto-refresh
- [ ] Implement `auditLogger.ts`
- [ ] Wire audit logging into all state-changing API routes
- [ ] Add loading skeletons throughout
- [ ] Add error boundaries
- [ ] Add all Framer Motion animations
- [ ] Add Cmd+K global search
- [ ] Final responsive/mobile testing
- [ ] Security review: check all API route guards

---

## ADDITIONAL NOTES FOR CURSOR

### Critical Implementation Details

1. **MSAL React v3 pattern**: Use `useMsal()` hook for access tokens. Call `instance.acquireTokenSilent()` before every Graph/API call. Wrap entire app in `<MsalProvider instance={msalInstance}>`.

2. **Prisma Client Singleton**: Use a module-level singleton to avoid "too many DB connections" in Next.js dev mode hot reload:
```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

3. **Bearer token in API calls**: Always attach:
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

4. **Type safety for API responses**: Use Zod to validate both incoming request bodies AND API response shapes. Create shared types in `src/types/`.

5. **Leave calendar blocking**: In the calendar, mark dates that are already on approved/pending leave as disabled (cannot re-select). Weekends should be non-selectable.

6. **Half-day edge case**: If start date and end date are the same, only ONE half-day option can be active (the user picks either AM or PM for that single day, = 0.5 days).

7. **Business day calculation**: Use `date-fns` `eachDayOfInterval` + filter out Saturdays and Sundays. In future: also filter public holidays stored in `SystemSettings`.

8. **Graph email from server**: Email sending must happen server-side (API route), never from the client. Use `client_credentials` flow (not user delegated) so a service account sends emails.

9. **Animations must not block**: Use `initial={false}` on `AnimatePresence` to prevent initial mount animations from firing. Use `layout` prop on list items for smooth reordering.

10. **Responsive sidebar**: On screens < 768px, sidebar should be hidden by default and shown as an overlay when hamburger is tapped. On ≥ 1024px, it's always visible.

---

*This prompt is complete and self-contained. Build the application exactly as described. Start with Phase 0 and work through each phase sequentially. Do not skip phases. Test each phase before proceeding to the next.*
