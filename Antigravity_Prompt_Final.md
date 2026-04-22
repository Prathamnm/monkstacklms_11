# Antigravity Prompt — Moonshine LMS Final Prototype

> Hand this entire document to Antigravity as the task brief.
> It is self-contained. Every section references exact files and exact logic.

---

## GLOBAL RULES — READ BEFORE TOUCHING ANYTHING

1. **DO NOT touch any authentication files.** This means no changes to: `src/lib/auth/`, `src/middleware.ts`, `src/app/auth/`, `src/app/login/`, `src/app/api/auth/`, `src/lib/auth/msalConfig.ts`, `src/lib/auth/msalInstance.ts`, `src/lib/auth/validateToken.ts`, `src/lib/auth/graphClient.ts`, or any MSAL-related code.

2. **DO NOT touch `src/lib/email/acsMailer.ts`.** The email system uses ACS and is currently commented/disabled to prevent usage. Leave it exactly as-is. Do not add, remove, or change any imports or calls to it — and do not reference `graphMailer` anywhere since it no longer exists.

3. **DO NOT remove any Prisma schema fields, existing API routes, or backend logic** unless the specific task says to remove a UI element. Removing a tab or button from the frontend does not mean deleting the backend route.

4. **Maintain design consistency** throughout: rounded corners use `rounded-xl` or `rounded-3xl` for cards, `text-sm` for body, `text-xs` for labels, `text-slate-900/700/500/400` for text hierarchy. All pages must look and feel like the same app.

5. **Reduce whitespace** across all pages where possible without breaking layouts. Target `p-4 lg:p-6` instead of `p-6 lg:p-8` where it creates excess empty space.

6. **When a feature is removed from the UI, remove it completely:** the tab, the component, the state variables that drive it, and the imports that are now unused. No dead code.

7. Every `<a href="mailto:...">` link must be styled `text-blue-600 hover:text-blue-700 hover:underline` — this is called out explicitly in several tasks below.

---

## TASK 1 — PROFILE PHOTO UPLOAD FOR ALL USERS

**Files affected:**
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/api/auth/me/route.ts` (or create `src/app/api/profile/photo/route.ts`)
- `src/types/auth.ts` (already has `profilePictureUrl`)

**What to build:**

Add a profile photo upload UI to the profile page for **all roles** (Employee, Manager, HR, Admin).

**UI:**
- On the profile card's avatar circle (`w-20 h-20`), add an overlay on hover: a semi-transparent dark overlay with a camera icon (use `Camera` from lucide-react) and text "Change Photo".
- Clicking the avatar opens a hidden `<input type="file" accept="image/*">`.
- Show a loading spinner on the avatar while uploading.
- After upload success, refresh the avatar immediately (invalidate the `currentUser` query).
- Show a `toast.success('Profile photo updated')` on success and `toast.error(...)` on failure.

**Backend — create `src/app/api/profile/photo/route.ts`:**

```ts
// POST /api/profile/photo
// Accepts multipart/form-data with field "photo" (image file)
// Stores as base64 data URL in employee.profilePictureUrl
// Only allows JPEG and PNG. Max 2MB.
// Returns { profilePictureUrl: string }
```

Implementation:
- Parse the uploaded file from `request.formData()`.
- Validate: only `image/jpeg` or `image/png`, max 2MB (2 * 1024 * 1024 bytes). Return 400 on validation failure with clear message.
- Convert to base64 data URL: `data:image/jpeg;base64,<base64string>` or `data:image/png;base64,...`.
- Update `prisma.employee.update({ where: { id: token.userId }, data: { profilePictureUrl: dataUrl } })`.
- Return `{ profilePictureUrl: dataUrl }`.

**Frontend call:**
```ts
const formData = new FormData()
formData.append('photo', file)
const res = await fetch('/api/profile/photo', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
})
```

Also update `src/components/layout/Sidebar.tsx` and `src/app/(dashboard)/admin/dashboard/page.tsx` — both render the avatar. They already read `user.profilePictureUrl`, so no change needed there as long as the query cache is invalidated. Confirm the `useCurrentUser` hook is invalidated after upload.

---

## TASK 2 — ADMIN DASHBOARD REDESIGN

**File:** `src/app/(dashboard)/admin/dashboard/page.tsx`

**Changes:**

### 2a. Welcome Card — Match other dashboards
The current welcome card shows the avatar, then name below, then date below that as a separate line. Change it so:

- The card is a single row: **avatar** on left, then **name + job title stacked** in the middle, then **date** pushed to the far right (`ml-auto`).
- Format: `Welcome back, {firstName} 👋` as the main line, `{user.jobTitle ?? 'System Administrator'}` as the subtitle (smaller, `text-slate-500`).
- The role badge stays below the job title.
- Date format stays `format(new Date(), 'EEEE, MMMM d, yyyy')` but is right-aligned.

```tsx
<div className="flex items-center gap-4">
  {/* avatar */}
  <div className="flex-1 min-w-0">
    <p className="text-lg font-semibold text-slate-900">Welcome back, {firstName} 👋</p>
    <p className="text-sm text-slate-500">{user?.jobTitle ?? 'System Administrator'}</p>
    {/* role badge */}
  </div>
  <div className="text-right flex-shrink-0">
    <p className="text-sm text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
  </div>
</div>
```

### 2b. Remove System Status cards
In the 4-card stats grid, remove the **"System Status"** card (`value: '✅'`) and the **"Environment"** card (`value: process.env.NODE_ENV`). Keep only **"Active Employees"** and **"Pending Approvals"**. Change the grid to `grid-cols-2` instead of `grid-cols-4`.

### 2c. Remove Quick Actions tiles entirely
Remove the entire Quick Actions section — the 5 clickable tiles for Users, Approvals, Audit, Settings, Reports. Remove all associated state and imports (`Settings`, `BarChart2`, `CheckSquare` icons) if no longer used after this removal.

The navigation sidebar already covers these links. These tiles are redundant.

### 2d. Keep these sections exactly as-is:
- Recent Audit Events
- Leave Accrual (run accrual button)
- Announcements (with post + delete)

---

## TASK 3 — ADMIN USER MANAGEMENT OVERHAUL

**File:** `src/app/(dashboard)/admin/users/page.tsx`

### 3a. Remove Role Change Feature entirely from UI
- Remove the `<select>` dropdown for role change in the Actions column.
- Remove the "Update" button.
- Remove the `roleChanges` state, `updatingRoleId` state, `handleRoleChange` function, `ROLE_OPTIONS` constant.
- Remove the amber warning banner about Azure role changes.
- Remove import of `Role` type if only used for role change.
- The backend route `src/app/api/admin/users/[id]/role/route.ts` should **NOT be deleted** — only the frontend UI calling it is removed.

### 3b. Table columns — simplify
The table should show exactly these columns:
1. **Employee** — avatar initials + display name + email (email as `<a href="mailto:...">` styled `text-blue-600 hover:underline`)
2. **Entra ID** — the truncated entraObjectId (keep as-is)
3. **Role** — role badge (keep as-is)
4. **Status** — employment status badge (keep as-is)
5. **Join Date** — formatted date (keep as-is)
6. **Actions** — **only** the delete button (Trash2 icon)

Remove the role-change select from Actions. Actions column now only contains the delete icon.

### 3c. Deletion — keep but clarify behavior
The delete button and `ConfirmDialog` should remain. The deletion behavior is: removes the employee from the LMS database (not from Azure). This is correct. Keep it.

Update the `ConfirmDialog` description text to:
> "This will permanently remove {name} and all their leave records from Monkstack HRM. Their Azure Entra ID account will NOT be affected. They will be re-added to the system automatically on their next login if still present in Azure."

### 3d. Remove the "Azure warning banner"
The amber banner about role changes was only relevant to the role-change feature. Remove it entirely.

---

## TASK 4 — ADMIN SYSTEM CONFIGURATION (Settings)

**File:** `src/app/(dashboard)/admin/settings/page.tsx`

**Remove the Timezone field entirely.**
- Remove the "Default Timezone" `<div>` block (label + input).
- Remove `timezone: 'UTC'` from `DEFAULT_SETTINGS`.
- The backend settings route does not need changes — it stores whatever keys are sent. Just stop sending `timezone` from the frontend.

The remaining settings stay: Company Name, Minimum Advance Notice, Email Sender Address, In-App Notifications toggle, Email Notifications toggle.

---

## TASK 5 — ADMIN APPROVALS — Remove Escalated Cases Tab

**File:** `src/app/(dashboard)/admin/leaves/page.tsx`

**Changes:**
- Remove the `TABS` constant (`['Escalated Cases', 'All Leaves']`).
- Remove the `activeTab` state and `setActiveTab` logic.
- Remove the tab bar (`<div className="flex border-b ...">`) entirely.
- Remove the `escalated` computed array and all `differenceInHours` logic.
- The page should now always show ALL leaves (the former "All Leaves" tab content) with no tab switcher.
- Remove import of `differenceInHours` from `date-fns` if it becomes unused.
- Keep: the table, the override modal, the `overrideMutation`, the `PageHeader`.
- Update `PageHeader` description to: `"Admin override capabilities for all leave requests."`.

---

## TASK 6 — ADMIN REPORTS — Replace "Leave Summary" Tab

**File:** `src/app/(dashboard)/admin/reports/page.tsx`

**Changes:**
- Remove the `'Leave Summary'` tab entirely.
- Remove the `leaveStats` query (`/api/hr/reports/leave-stats` — this endpoint does not exist in the codebase anyway, which is why it shows no data).
- Remove the `activeTab === 'Leave Summary'` render block.
- Add a new tab called **"Leave Overview"** alongside "System Usage".
- The Leave Overview tab queries `/api/hr/leaves?limit=20` (the existing endpoint that returns all leaves) and displays a simple summary table:
  - Columns: Employee, Period, Days, Status
  - Grouped by status: show counts at top — "X Pending · Y Approved · Z Rejected"
  - Use the existing `LeaveStatusBadge` component for status.
  - Import `LeaveStatusBadge` from `@/components/leave/LeaveStatusBadge`.
  - Import `formatDateRange` from `@/lib/utils/dateUtils`.
  - Add query:
    ```ts
    const { data: allLeaves = [] } = useQuery({
      queryKey: ['adminLeaveOverview'],
      queryFn: async () => {
        const token = await getAccessToken(instance)
        const res = await fetch('/api/hr/leaves', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return []
        return res.json()
      },
      enabled: activeTab === 'Leave Overview',
    })
    ```

Update `TABS` to: `['Leave Overview', 'System Usage'] as const`.
Set the default `activeTab` to `'Leave Overview'`.

---

## TASK 7 — ADMIN NOTIFICATIONS FIX

**Issue:** The notification bell in the admin dashboard shows no notifications. The `useNotifications` hook calls `/api/notifications` which queries by `recipientId: token.userId`. This is correct. The issue is likely that notifications created by `prisma.notification.createMany` use `recipientId` which maps to the admin's employee ID, and the admin's token.userId must match. This is already correct in the backend.

**Root cause to investigate and fix:** The `ROLE_CHANGED` notification type used in `src/app/api/admin/users/[id]/role/route.ts` (`type: 'ROLE_CHANGED'`) does not exist in the `NotificationType` enum defined in `src/lib/notifications/notificationService.ts` — which only has `'ROLE_CHANGED'` listed but the Prisma schema may use a different casing. 

**Fix:**
1. Open `src/lib/notifications/notificationService.ts`. Verify `ROLE_CHANGED` is in the `NotificationType` union type. If missing, add it.
2. Open `src/app/api/notifications/route.ts`. Verify it queries `prisma.notification.findMany({ where: { recipientId: token.userId } })`. This is correct as-is.
3. Open `src/hooks/useNotifications.ts`. The hook already polls every 30s. Verify the Authorization header is sent correctly — it is.
4. **The real fix:** In the `NotificationBell` component (`src/components/layout/NotificationBell.tsx`), add `'ANNOUNCEMENT_POSTED'` and `'ROLE_CHANGED'` to the `notificationIcons` map if missing:
   ```ts
   ANNOUNCEMENT_POSTED: '📢',
   ROLE_CHANGED: '🔄',
   HOLIDAY_CREATED: '🗓️',
   LEAVE_REVOKED: '⚠️',
   ```
5. The `TopHeader` is rendered inside `DashboardLayout` for ALL roles including ADMIN. Verify `src/app/(dashboard)/layout.tsx` includes `<TopHeader>` for admin — it should already. If not, ensure the layout wraps admin routes identically to other roles.

---

## TASK 8 — CALENDAR: "On Leave" Dot Tooltip Shows Employee Name

**Files affected:**
- `src/app/(dashboard)/manager/calendar/page.tsx`
- `src/app/(dashboard)/hr/calendar/page.tsx`

**Both calendars have the same `CalendarGrid` component. Apply identical changes to both.**

**Current state:** Blue dots appear on approved-leave dates but hovering shows nothing. Amber dots for pending show nothing on hover either.

**What to change:**

The `CalendarGrid` component currently takes:
```ts
approvedLeaveDates: string[]
pendingLeaveDates: string[]
```

Change it to take:
```ts
approvedLeaves: Array<{ startDate: string; endDate: string; employeeName: string }>
pendingLeaves:  Array<{ startDate: string; endDate: string; employeeName: string }>
```

Build a map of `dateString → employeeNames[]` instead of just a Set:
```ts
// Build map: date string (toDateString) → array of names
const approvedLeaveMap = new Map<string, string[]>()
approvedLeaves.forEach(l => {
  const cur = new Date(l.startDate)
  while (cur <= new Date(l.endDate)) {
    const key = cur.toDateString()
    approvedLeaveMap.set(key, [...(approvedLeaveMap.get(key) ?? []), l.employeeName])
    cur.setDate(cur.getDate() + 1)
  }
})
```

Then in the day cell, replace:
```tsx
{isOnLeave && <span className="w-2 h-2 rounded-full bg-blue-500" />}
```
with:
```tsx
{namesOnLeave.length > 0 && (
  <span
    title={namesOnLeave.join(', ')}
    className="w-2 h-2 rounded-full bg-blue-500 cursor-help"
  />
)}
```

Where `namesOnLeave = approvedLeaveMap.get(dateObj.toDateString()) ?? []`.

Do the same for pending leaves using `pendingLeaveMap`.

**Update the parent component data fetching** to include employee name. The `leaves` query returns `LeaveRequest` objects which already include `employee.displayName` from the API. Check the API:

- Manager: `GET /api/manager/leaves` — open `src/app/api/manager/leaves/route.ts` and ensure the response includes `employee: { select: { displayName: true } }`. If it doesn't, add it.
- HR: `GET /api/hr/leaves?status=PENDING,APPROVED` — check `src/app/api/hr/leaves/route.ts` and ensure `employee.displayName` is included in the response.

Pass the full leave objects (with `employee.displayName`) to `CalendarGrid`.

---

## TASK 9 — HR: RENAME "EMPLOYEE HUB" TO "TEAM MONKSTACK"

**File:** `src/app/(dashboard)/hr/employees/page.tsx`

In the `PageHeader`, change:
```tsx
title="Employee Hub"
description="Manage your workforce and oversee roles. Employee data is synced from Azure."
```
to:
```tsx
title="Team Monkstack"
description="Manage your workforce and oversee roles. Employee data is synced from Azure."
```

---

## TASK 10 — HR: MAILTO LINKS STYLED IN BLUE

**Files to check and fix:**

Anywhere an employee email is rendered as a plain `<a href="mailto:...">` or plain text, make sure it is:
```tsx
<a
  href={`mailto:${email}`}
  className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
  onClick={e => e.stopPropagation()}
>
  {email}
</a>
```

Apply to these files:
1. `src/app/(dashboard)/hr/employees/page.tsx` — employee email in the table
2. `src/app/(dashboard)/hr/employees/[id]/page.tsx` — email in the detail page
3. `src/app/(dashboard)/admin/users/page.tsx` — already styled partially, confirm it's `text-blue-600`
4. `src/app/(dashboard)/manager/employees/page.tsx` — any email display

---

## TASK 11 — HR REPORTS: REMOVE "ATTENDANCE OVERVIEW"

**File:** `src/app/(dashboard)/hr/reports/page.tsx`

In the `REPORT_TYPES` array, remove the entry with `id: 'attendance-overview'`:
```ts
{
  id: 'attendance-overview',
  title: 'Attendance Overview',
  description: 'Who was on leave each day — useful for payroll',
},
```

This leaves 3 reports: Leave Summary, Leave Balance, Employee Directory.

The backend export route (`src/app/api/hr/reports/export/route.ts`) has a `case 'attendance-overview'` in its switch statement. **Remove that case block entirely** to avoid dead code. Do not remove the other cases.

---

## TASK 12 — WHITESPACE REDUCTION (UI Polish)

Apply to ALL dashboard pages (admin, hr, manager, employee):

1. **Page padding**: Change `className="p-6 lg:p-8 space-y-6"` to `className="p-4 lg:p-6 space-y-4"` on all top-level page wrapper divs. This applies to: admin/dashboard, admin/users, admin/leaves, admin/reports, admin/settings, admin/audit, hr/dashboard, hr/employees, hr/calendar, hr/leaves, hr/reports, manager/dashboard, manager/employees, manager/calendar, manager/approvals, employee/dashboard, employee/my-team, employee/calendar, employee/apply-leave, employee/my-leaves, profile.

2. **Card padding**: Where cards have `p-6`, change to `p-5`. Where they have `p-5`, leave them as-is.

3. **Table rows**: `py-4` on `<td>` and `<th>` → `py-3`.

4. **Section spacing**: `space-y-6` on outer wrappers → `space-y-4`.

5. **Do not change** layout structure, grid columns, border-radius, colors, or any functional logic.

---

## TASK 13 — BROKEN LINK AND LOGIC AUDIT — FIX ALL OF THESE

### 13a. Admin `quickActions` array points to `/admin/approvals` — wrong path
In `src/app/(dashboard)/admin/dashboard/page.tsx`, the quickActions array has:
```ts
{ label: 'Approvals', href: '/admin/approvals' }
```
The actual route is `/admin/leaves` (defined in `src/constants/routes.ts` as `ROUTES.ADMIN.APPROVALS = '/admin/leaves'`). However, since the entire Quick Actions section is being removed in Task 2c, this bug disappears automatically. Confirm the removal handles this.

### 13b. Profile page "Manage employees" button goes to `/hr/employees` for ADMIN
In `src/app/(dashboard)/profile/page.tsx`:
```tsx
{(user.role === 'HR' || user.role === 'ADMIN') && (
  <button onClick={() => router.push('/hr/employees')}>Manage employees</button>
)}
```
Admin should go to `/admin/users`, not `/hr/employees`. Fix:
```tsx
{user.role === 'HR' && (
  <button onClick={() => router.push('/hr/employees')}>Manage employees</button>
)}
{user.role === 'ADMIN' && (
  <button onClick={() => router.push('/admin/users')}>Manage users</button>
)}
```

### 13c. Admin leave override missing `notificationEmail` in employee select
**File:** `src/app/api/admin/leaves/[id]/override/route.ts`

The employee select is:
```ts
employee: { select: { id: true, displayName: true, workEmail: true, managerId: true } }
```
It is missing `notificationEmail: true`. Add it so `getNotificationEmail()` works correctly:
```ts
employee: { select: { id: true, displayName: true, workEmail: true, notificationEmail: true, managerId: true } }
```

### 13d. Manager leaves API must include employee name for calendar
**File:** `src/app/api/manager/leaves/route.ts`

Ensure the `findMany` includes:
```ts
include: {
  employee: { select: { displayName: true } }
}
```
If this is already present, leave it. If not, add it. This is required for Task 8 (calendar tooltip).

### 13e. HR leaves API must include employee name for calendar
**File:** `src/app/api/hr/leaves/route.ts`

Same as 13d — ensure `employee: { select: { displayName: true } }` is included in the query.

### 13f. `useCurrentUser` hook — verify it returns `manager` field for profile page
**File:** `src/hooks/useCurrentUser.ts` and `src/app/api/auth/me/route.ts`

The profile page accesses `(user as any).manager?.displayName`. The `/api/auth/me` route must include manager in its query. Open `src/app/api/auth/me/route.ts` and ensure:
```ts
include: {
  manager: { select: { displayName: true } }
}
```
or equivalent `select` with a `manager` join. If missing, add it.

### 13g. Admin reports — `/api/hr/reports/leave-stats` does not exist
This endpoint is called in the current admin reports `Leave Summary` tab. Since Task 6 replaces this tab entirely with `Leave Overview` querying `/api/hr/leaves`, this broken reference disappears. Confirm no other file imports or calls `/api/hr/reports/leave-stats`.

### 13h. `ROUTES.ADMIN.EMPLOYEES` defined but no route exists
In `src/constants/routes.ts`:
```ts
EMPLOYEES: '/admin/employees',
```
There is no page at `/admin/employees`. This is a dead route. Remove `EMPLOYEES` from `ROUTES.ADMIN`. Verify nothing else references it (grep for `/admin/employees` in all TSX/TS files and remove any links to it).

### 13i. `src/app/(dashboard)/admin/dashboard/page.tsx` — unused icons after Task 2c
After removing Quick Actions in Task 2c, these imports may become unused: `Settings`, `BarChart2`, `CheckSquare` from `lucide-react`. Remove them from the import line.

### 13j. Sidebar "Team Monkstack" for HR
In `src/components/layout/Sidebar.tsx`, the HR nav already shows `Team Monkstack` pointing to `/hr/employees`. Since Task 9 renames the page title to "Team Monkstack", the sidebar label already matches. No change needed — just confirm they're consistent.

---

## TASK 14 — WHAT NOT TO CHANGE (EXPLICIT PRESERVATION LIST)

Do not modify any of the following:
- `src/lib/email/acsMailer.ts` — ACS email, leave as-is
- `src/lib/auth/graphClient.ts` — used for Azure login/sync
- `src/middleware.ts` — auth middleware
- `src/app/api/auth/` — all auth API routes
- `src/app/login/` and `src/app/auth/callback/` — login flow
- `src/lib/leave/` — all leave business logic
- `src/lib/notifications/notificationService.ts` — except adding missing types if needed (Task 7)
- `src/app/api/leave/` — all leave API routes
- `src/app/api/manager/approvals/` — all approval routes
- `src/app/api/hr/leaves/` — all HR leave routes (except minor select additions in 13e)
- `src/app/api/admin/leaves/` — keep all routes, only UI changes
- `src/app/api/admin/users/[id]/role/route.ts` — keep it, only UI calling it is removed
- All email template files in `src/lib/email/templates/`
- Prisma schema (no DB changes)
- All existing working Outlook `mailto:` links in the UI — just style them blue per Task 10

---

## SUMMARY CHECKLIST

| # | Task | Files |
|---|------|-------|
| 1 | Profile photo upload for all users | `profile/page.tsx`, new `api/profile/photo/route.ts` |
| 2a | Admin dashboard welcome card layout | `admin/dashboard/page.tsx` |
| 2b | Remove System Status + Environment stat cards | `admin/dashboard/page.tsx` |
| 2c | Remove Quick Actions tiles | `admin/dashboard/page.tsx` |
| 3a | Remove role change UI from User Management | `admin/users/page.tsx` |
| 3b | Simplify table columns | `admin/users/page.tsx` |
| 3c | Keep delete, update confirm text | `admin/users/page.tsx` |
| 3d | Remove Azure warning banner | `admin/users/page.tsx` |
| 4 | Remove Timezone from System Config | `admin/settings/page.tsx` |
| 5 | Remove Escalated Cases tab from Approvals | `admin/leaves/page.tsx` |
| 6 | Replace Leave Summary with Leave Overview in Reports | `admin/reports/page.tsx` |
| 7 | Fix admin notifications (notification types + icon map) | `NotificationBell.tsx`, `notificationService.ts` |
| 8 | Calendar "On Leave" dot tooltip with employee name | `manager/calendar`, `hr/calendar`, `api/manager/leaves`, `api/hr/leaves` |
| 9 | Rename Employee Hub → Team Monkstack | `hr/employees/page.tsx` |
| 10 | Style all mailto links in blue | `hr/employees`, `hr/employees/[id]`, `admin/users`, `manager/employees` |
| 11 | Remove Attendance Overview from HR Reports | `hr/reports/page.tsx`, `api/hr/reports/export/route.ts` |
| 12 | Whitespace reduction across all pages | All page files |
| 13a | Fix broken `/admin/approvals` link (removed with Task 2c) | `admin/dashboard` |
| 13b | Fix Admin profile → wrong employees link | `profile/page.tsx` |
| 13c | Fix missing `notificationEmail` in override select | `api/admin/leaves/[id]/override/route.ts` |
| 13d | Manager leaves API include employee name | `api/manager/leaves/route.ts` |
| 13e | HR leaves API include employee name | `api/hr/leaves/route.ts` |
| 13f | `auth/me` include manager relation | `api/auth/me/route.ts` |
| 13g | Dead `/api/hr/reports/leave-stats` ref (gone with Task 6) | `admin/reports/page.tsx` |
| 13h | Remove dead `ROUTES.ADMIN.EMPLOYEES` | `constants/routes.ts` |
| 13i | Remove unused icon imports after Task 2c | `admin/dashboard/page.tsx` |
