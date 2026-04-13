# MOONSHINE LMS — ANTIGRAVITY FINAL TOUCHES PROMPT

## ABSOLUTE NON-NEGOTIABLE RULES
- **DO NOT touch** any file in `src/lib/auth/`, `src/app/auth/`, `src/app/api/auth/`, `src/lib/email/`, or `src/lib/notifications/` — authentication, MSAL, token validation, email sending, and notifications are all working perfectly and must not be modified under any circumstance
- **DO NOT restructure** any page's overall layout — only make the specific surgical changes described below
- **DO NOT add** any features not listed in this prompt
- Every change is scoped exactly to what is described — nothing more, nothing less

---

## CHANGE 1 — LOGIN PAGE: Fully centre the content panel

**File:** `src/app/login/page.tsx`

**What to change:** The login form is currently left-aligned on desktop (`lg:w-1/2`). Centre the entire form panel both horizontally and vertically on all screen sizes while keeping the animated ribbon background on the right side intact.

**Exact change:** The outermost `<div>` currently has `className="min-h-screen flex flex-col lg:flex-row bg-[#060b14]"`. The left panel div currently has `className="relative flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-24 lg:w-1/2 lg:max-w-none"`.

Replace only the left panel's className with:
```
"relative flex flex-1 flex-col items-center justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-24"
```

The `motion.div` inside it already has `className="relative z-10 mx-auto w-full max-w-md"` — **do not change this**, it already centres the content within the panel.

The right side ribbon art div must remain completely untouched.

---

## CHANGE 2 — EMPLOYEE DASHBOARD: Fix Leave Balance card to span full width

**File:** `src/app/(dashboard)/employee/dashboard/page.tsx`

**Problem:** The Leave Balance card is the third item in a `xl:grid-cols-4` grid but since there are only 3 items, it sits in the third column and leaves a gap. It needs to span the remaining columns to fill the row end-to-end like the screenshot shows.

**Exact change:** The stat cards grid uses `className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"`. There are 3 items: `SummaryCard` (Active projects), `SummaryCard` (Pending leave requests), and the custom Leave Balance `motion.div`.

Change the Leave Balance `motion.div` to span 2 columns on xl screens:

```tsx
<motion.div variants={item} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:col-span-2 xl:col-span-2">
```

This makes the Leave Balance card span 2 of the 4 columns on xl screens and 2 of the 2 columns on sm screens, so all 4 columns are filled and the card stretches end-to-end.

Also expand the inner content to use the extra space — change the Leave Balance inner div from:
```tsx
<div className="flex gap-6">
```
to:
```tsx
<div className="flex gap-12">
```

---

## CHANGE 3 — CALENDARS: Remove Outlook meeting section and indigo dot from legend

**Files:** 
- `src/app/(dashboard)/employee/calendar/page.tsx`
- `src/app/(dashboard)/manager/calendar/page.tsx`  
- `src/app/(dashboard)/hr/calendar/page.tsx`

**What to do in each file:**

**3A. Remove the `outlookEvents` query entirely.** Find and delete the entire `useQuery` block that has `queryKey: ['outlookCalendarEvents']` — the full `const { data: outlookEvents = [] } = useQuery({...})` block including all its lines.

**3B. Remove the `getGraphCalendarToken` import.** Find the line:
```ts
import { getGraphCalendarToken } from '@/lib/auth/getGraphCalendarToken'
```
Delete it.

**3C. Remove the "Upcoming Meetings from Outlook" section from the JSX.** Find and delete the entire block:
```tsx
{/* Upcoming Meetings from Outlook */}
{outlookEvents.length > 0 && (
  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
    ...entire block...
  </div>
)}
```

**3D. Remove the indigo dot from the legend.** Find in each calendar page:
```tsx
<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Outlook Meeting</span>
```
Delete just this line. Keep the red, yellow, and blue dot legend items unchanged.

**3E. Do NOT remove the `outlookEvents` query from `CalendarGrid` component props if it is passed there — check that `CalendarGrid` does not reference `outlookEvents` in its props. If it does not, step 3A is sufficient. If `outlookEvents` is passed as a prop to `CalendarGrid`, also remove it from the props interface and usage.**

---

## CHANGE 4 — HR TEAM MONKSTACK: Remove Department column, add Reporting To, fix broken View link, rename page title

**File:** `src/app/(dashboard)/hr/employees/page.tsx`

### 4A. Update the API call to include manager data

The current fetch is `GET /api/hr/employees?status=ACTIVE`. The employee records returned need to include the manager's `displayName`. Update the `GET /api/hr/employees/route.ts` to include manager info.

**File:** `src/app/api/hr/employees/route.ts`

In the `prisma.employee.findMany`, add `manager` to the include block:
```ts
include: {
  manager: { select: { id: true, displayName: true } },
  leaveRequests: {
    where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
  },
  projectMemberships: {
    where: { isActive: true },
    include: { project: { select: { id: true, name: true, code: true, color: true } } },
  },
},
```

In the `result` map, add `managerName` to the returned object:
```ts
managerName: emp.manager?.displayName ?? null,
```

### 4B. Update `EmployeeWithAvailability` type to include `managerName`

**File:** `src/types/employee.ts`

Add `managerName?: string | null` to the `EmployeeWithAvailability` interface.

### 4C. Update the HR employees page table

**File:** `src/app/(dashboard)/hr/employees/page.tsx`

**Remove** the `Department` column header and its corresponding `<td>`:
```tsx
// DELETE this <th>:
<th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>

// DELETE the corresponding <td>:
<td className="px-5 py-3 text-slate-600 text-sm">{employee.department ?? '—'}</td>
```

**Add** a "Reporting To" column header in place of Department:
```tsx
<th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Reporting To</th>
```

**Add** the corresponding data cell in the table body in place of Department:
```tsx
<td className="px-5 py-3 text-slate-600 text-sm">{(employee as any).managerName ?? '—'}</td>
```

### 4D. Fix the broken "View →" link in the Actions column

The current button uses `router.push(`/hr/employees/${employee.id}`)`. This is NOT broken in itself, but the `hr/employees/[id]` page may be throwing an error. Check `src/app/(dashboard)/hr/employees/[id]/page.tsx` — the page fetches employee data but the `editForm` state is initialized with empty strings and uses `useState(() => {...})` to set values when data loads. This is incorrect usage of `useState` with an initialiser function — it only runs once on mount before data is available.

**Fix the state initialisation in `src/app/(dashboard)/hr/employees/[id]/page.tsx`:**

Find:
```tsx
// Set form when data loads
const [editForm, setEditForm] = useState({\n    designation: '', department: '', phoneNumber: '', emergencyContact: '', managerId: '', role: '', employmentStatus: ''\n  })
  
  // Set form when data loads
  useState(() => {
    if (data?.employee && !editForm.role) {
      setEditForm({...
```

Replace the broken `useState(() => {...})` pattern with a proper `useEffect`. Change:
```tsx
useState(() => {
  if (data?.employee && !editForm.role) {
    setEditForm({ ... })
  }
})
```
To:
```tsx
useEffect(() => {
  if (data?.employee) {
    setEditForm({
      designation: data.employee.designation ?? '',
      department: data.employee.department ?? '',
      phoneNumber: data.employee.phoneNumber ?? '',
      emergencyContact: data.employee.emergencyContact ?? '',
      managerId: data.employee.managerId ?? '',
      role: data.employee.role ?? '',
      employmentStatus: data.employee.employmentStatus ?? '',
    })
  }
}, [data?.employee?.id])
```

Make sure `useEffect` is imported from React at the top of the file. Add it to the existing import if not present:
```ts
import { useState, useEffect } from 'react'
```

---

## CHANGE 5 — HR ONBOARDING: Add "Reporting To" field + email domain validation + correct role logic

**File:** `src/app/(dashboard)/hr/lifecycle/onboard/page.tsx`

### 5A. Add `managerId` to the form interface and initial state

```ts
interface OnboardForm {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  designation: string
  role: string
  joinDate: string
  managerId: string   // ADD
}

const initialForm: OnboardForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  designation: '',
  role: 'EMPLOYEE',
  joinDate: new Date().toISOString().slice(0, 10),
  managerId: '',      // ADD
}
```

### 5B. Add query to fetch managers for the dropdown

Add this query inside the component (after the existing `useMutation`):

```tsx
const { data: managers = [] } = useQuery({
  queryKey: ['managersForOnboard'],
  queryFn: async () => {
    const token = await getAccessToken(instance)
    const res = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return []
    const all = await res.json()
    return all.filter((e: any) => e.role === 'MANAGER')
  },
})
```

Add `useQuery` to imports: `import { useMutation, useQuery } from '@tanstack/react-query'`

### 5C. Add email domain validation

Add a validation step before calling `onboardMutation.mutate()`. Add a `[emailError, setEmailError]` state:

```tsx
const [emailError, setEmailError] = useState('')
```

Add a validation function:
```tsx
function validateEmail(email: string): boolean {
  if (!email.endsWith('@monikajadhav1907gmail.onmicrosoft.com')) {
    setEmailError('Email must end with @monikajadhav1907gmail.onmicrosoft.com')
    return false
  }
  setEmailError('')
  return true
}
```

Update the submit button's `onClick`:
```tsx
onClick={() => {
  if (validateEmail(form.email)) {
    onboardMutation.mutate()
  }
}}
```

Show the email error inline below the email input:
```tsx
{emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
```

Also add live validation on the email `onChange`:
```tsx
onChange={(e) => { updateField('email', e.target.value); if (e.target.value) validateEmail(e.target.value) }}
```

### 5D. Add "Reporting To" dropdown field in the form JSX

**Logic:** EMPLOYEE and HR roles get a manager dropdown. MANAGER and ADMIN do not report to anyone (hide the field or show "N/A").

Add a conditional "Reporting To" field after the Role dropdown:

```tsx
{(form.role === 'EMPLOYEE' || form.role === 'HR') && (
  <div className="md:col-span-2">
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      Reporting To <span className="text-slate-400 text-xs">(Manager)</span>
    </label>
    <select
      value={form.managerId}
      onChange={(e) => updateField('managerId', e.target.value)}
      className="input w-full"
    >
      <option value="">— Select reporting manager —</option>
      {managers.map((m: any) => (
        <option key={m.id} value={m.id}>{m.displayName}</option>
      ))}
    </select>
  </div>
)}
```

### 5E. Send `managerId` in the mutation body

Update the `JSON.stringify` in the mutation:
```ts
body: JSON.stringify({
  firstName: form.firstName,
  lastName: form.lastName,
  email: form.email,
  phoneNumber: form.phoneNumber,
  designation: form.designation,
  role: form.role,
  startDate: form.joinDate,
  managerId: form.managerId || null,  // ADD
}),
```

### 5F. Update the onboard API to accept and store `managerId`

**File:** `src/app/api/hr/employees/onboard/route.ts`

Update the destructuring:
```ts
const { firstName, lastName, email, phoneNumber, designation, role, startDate, managerId } = body
```

Add server-side email domain validation:
```ts
if (!email.endsWith('@monikajadhav1907gmail.onmicrosoft.com')) {
  return NextResponse.json(
    { error: 'Email must use the company domain @monikajadhav1907gmail.onmicrosoft.com', code: 'INVALID_EMAIL' },
    { status: 400 }
  )
}
```

Add `managerId` to the `prisma.employee.create` data:
```ts
data: {
  entraObjectId: `pending-${email}`,
  email,
  displayName: `${firstName} ${lastName}`,
  firstName,
  lastName,
  phoneNumber,
  jobTitle: designation,
  designation,
  role: role ?? 'EMPLOYEE',
  employmentStatus: 'ACTIVE',
  joinDate: startDate ? new Date(startDate) : new Date(),
  managerId: managerId || null,    // ADD
},
```

---

## CHANGE 6 — HR DEBOARDING: Centralise the form

**File:** `src/app/(dashboard)/hr/lifecycle/offboard/page.tsx`

The form is currently inside `<div className="max-w-xl">`. To centre it like the onboarding form:

Find:
```tsx
<div className="max-w-xl">
```

Replace with:
```tsx
<div className="flex justify-center">
  <div className="w-full max-w-xl">
```

And close the extra div before the closing `</motion.div>`:
```tsx
  </div>
</div>
```

Also wrap the warning banner inside the centred container. The full structure inside the page content `<motion.div>` should be:
```tsx
<PageHeader title="Deboarding" description="Offboard an employee and revoke their system access." />
<div className="flex justify-center">
  <div className="w-full max-w-xl">
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium mb-6">
      ⚠️ ...warning text unchanged...
    </div>
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
      ...form unchanged...
    </form>
  </div>
</div>
```

---

## CHANGE 7 — REMOVE ALL DEMO/TEST EMPLOYEES FROM DATABASE

**This is a data migration, not a code change.**

### 7A. Create a cleanup script

**Create file:** `scripts/cleanup-test-users.ts`

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Removing demo/test employees...')

  // Find all employees whose email ends with @moonshine.test
  const testEmployees = await prisma.employee.findMany({
    where: {
      email: { endsWith: '@moonshine.test' },
    },
    select: { id: true, email: true, displayName: true },
  })

  if (testEmployees.length === 0) {
    console.log('✅ No test employees found. Database is already clean.')
    return
  }

  console.log(`Found ${testEmployees.length} test employees:`)
  testEmployees.forEach(e => console.log(`  - ${e.displayName} (${e.email})`))

  const testIds = testEmployees.map(e => e.id)

  // Delete in correct order to avoid FK violations
  await prisma.notification.deleteMany({ where: { OR: [{ recipientId: { in: testIds } }, { senderId: { in: testIds } }] } })
  await prisma.auditLog.deleteMany({ where: { OR: [{ performedBy: { in: testIds } }, { targetId: { in: testIds } }] } })
  await prisma.leaveLedgerEntry.deleteMany({ where: { employeeId: { in: testIds } } })
  await prisma.leaveRequest.deleteMany({ where: { OR: [{ employeeId: { in: testIds } }, { approverId: { in: testIds } }] } })
  await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: testIds } } })
  await prisma.employeeProject.deleteMany({ where: { employeeId: { in: testIds } } })
  await prisma.announcement.deleteMany({ where: { postedBy: { in: testIds } } })
  
  // Remove manager references from other employees
  await prisma.employee.updateMany({
    where: { managerId: { in: testIds } },
    data: { managerId: null },
  })

  // Finally delete the employees themselves
  const deleted = await prisma.employee.deleteMany({
    where: { id: { in: testIds } },
  })

  console.log(`✅ Deleted ${deleted.count} test employees successfully.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 7B. Add the script to `package.json` scripts

**File:** `package.json`

In the `"scripts"` section, add:
```json
"db:cleanup-test": "ts-node --project tsconfig.json scripts/cleanup-test-users.ts"
```

### 7C. Run the cleanup

After Antigravity applies the code changes, run this once:
```bash
npm run db:cleanup-test
```

### 7D. Update `prisma/seed.ts` to remove all `@moonshine.test` entries

The seed already uses `@monikajadhav1907gmail.onmicrosoft.com` emails for admin, hr, manager. But it still creates `employee1` and `employee2` with placeholder emails. Update those:

Find the `employee1` upsert — change:
```ts
update: { email: 'alice@monikajadhav1907gmail.onmicrosoft.com' },
create: {
  ...
  email: 'alice@monikajadhav1907gmail.onmicrosoft.com',
```

Find the `employee2` upsert — change:
```ts
update: { email: 'bob@monikajadhav1907gmail.onmicrosoft.com' },
create: {
  ...
  email: 'bob@monikajadhav1907gmail.onmicrosoft.com',
```

Make sure NO email in the seed file contains `@moonshine.test`. Search the entire seed.ts for `@moonshine.test` and replace every occurrence with the correct `@monikajadhav1907gmail.onmicrosoft.com` domain.

---

## CHANGE 8 — AVAILABILITY STATUS: Fix real-time leave status in Team Monkstack and Manager's On Leave Today

**Problem:** The availability status shown in Team Monkstack and in the Manager dashboard "On Leave Today" counter is not reflecting actual leave status correctly. The `getAvailabilityForDate` utility is already correctly implemented, but the data it receives may not have today's date filtered properly.

### 8A. Fix `GET /api/employees/route.ts` — ensure leave status is real-time

**File:** `src/app/api/employees/route.ts`

The current query filters leaves with `startDate: { lte: today }, endDate: { gte: today }`. This is correct but `today` must be set to the **start of today** (midnight) to avoid time-of-day edge cases.

Replace:
```ts
const today = new Date()
```
With:
```ts
const today = new Date()
today.setHours(0, 0, 0, 0)
const todayEnd = new Date()
todayEnd.setHours(23, 59, 59, 999)
```

Update the leave filter:
```ts
leaveRequests: {
  where: {
    status: 'APPROVED',
    startDate: { lte: todayEnd },
    endDate: { gte: today },
  },
},
```

### 8B. Fix `GET /api/manager/employees/route.ts` — same fix

**File:** `src/app/api/manager/employees/route.ts`

Apply the same `today` / `todayEnd` fix to the `leaveRequests` where clause.

### 8C. Fix `GET /api/hr/employees/route.ts` — same fix

**File:** `src/app/api/hr/employees/route.ts`

Apply the same `today` / `todayEnd` fix.

### 8D. Fix the Manager Dashboard "On Leave Today" count

**File:** `src/app/(dashboard)/manager/dashboard/page.tsx`

The `onLeaveToday` count is computed from the employees array:
```ts
const onLeaveToday = (employees as Array<{ availabilityStatus: string }>)
  .filter((e) => e.availabilityStatus !== 'AVAILABLE').length
```

This is correct — it will work once the API fix in 8B is applied. No UI change needed here. The fix to the API data is sufficient.

---

## CHANGE 9 — MANAGER SIDEBAR + PAGE: Rename "My Team" to "Team Monkstack" and "My Projects" to "Ongoing Projects"

### 9A. Update Sidebar

**File:** `src/components/layout/Sidebar.tsx`

In the `MANAGER` case of `getNavItems`, find:
```tsx
{ label: 'My Team',     href: '/manager/employees',   icon: <Users size={18} /> },
```
Change to:
```tsx
{ label: 'Team Monkstack', href: '/manager/employees', icon: <Users size={18} /> },
```

And find:
```tsx
{ label: 'My Projects', href: '/manager/projects',    icon: <FolderKanban size={18} /> },
```
Change to:
```tsx
{ label: 'Ongoing Projects', href: '/manager/projects', icon: <FolderKanban size={18} /> },
```

### 9B. Update Manager Employees page title

**File:** `src/app/(dashboard)/manager/employees/page.tsx`

Find the `PageHeader` component usage and change `title`:
```tsx
// Find:
<PageHeader title="Employees" description="Your team members and their detailed records." badge={employees.length} />

// Change to:
<PageHeader title="Team Monkstack" description="All active team members and their records." badge={employees.length} />
```

### 9C. Add email mailto link in Manager employees table and fix search bar width

**File:** `src/app/(dashboard)/manager/employees/page.tsx`

**Add email as clickable mailto in the employee table row.** In the `<EmployeeDetailPanel>` component or in the main table row, ensure the email is shown as a clickable link. In the main employee table, each row currently shows `employee.email` as plain text. Find:
```tsx
<p className="text-slate-500 text-[11px]">{employee.email}</p>
```
Replace with:
```tsx
<p className="text-slate-500 text-[11px]">
  <a href={`mailto:${employee.email}`} className="hover:text-blue-600 hover:underline transition-colors" onClick={e => e.stopPropagation()}>
    {employee.email}
  </a>
</p>
```

**Fix search bar width.** The current search input is:
```tsx
<div className="relative max-w-sm">
```
Change to fill available space or align right:
```tsx
<div className="relative w-full">
```

### 9D. Update Manager Projects page title

**File:** `src/app/(dashboard)/manager/projects/page.tsx`

Find:
```tsx
<PageHeader
  title="Projects"
  description="Manage project assignments and team allocations"
```
Change to:
```tsx
<PageHeader
  title="Ongoing Projects"
  description="Create and manage your active projects"
```

---

## CHANGE 10 — MANAGER APPROVALS: Add approval comment field alongside rejection reason

**File:** `src/app/(dashboard)/manager/approvals/page.tsx`

Currently there is a `rejectionReason` state and a textarea inside the reject `ConfirmDialog`. Add an equivalent `approvalComment` state and textarea inside the approve `ConfirmDialog`.

### 10A. Add state variable

Find:
```tsx
const [rejectionReason, setRejectionReason] = useState('')
```
Add below it:
```tsx
const [approvalComment, setApprovalComment] = useState('')
```

### 10B. Reset approvalComment on success

Find in `onSuccess`:
```tsx
setRejectionReason('')
```
Add below it:
```tsx
setApprovalComment('')
```

### 10C. Pass `approvalComment` when approving

Find the approve `ConfirmDialog`'s `onConfirm`:
```tsx
onConfirm={() =>
  selectedLeave &&
  actionMutation.mutate({ id: selectedLeave.id, action: 'approve' })
}
```
Change to:
```tsx
onConfirm={() =>
  selectedLeave &&
  actionMutation.mutate({ id: selectedLeave.id, action: 'approve', reason: approvalComment })
}
```

### 10D. Add textarea inside the Approve ConfirmDialog

Find the Approve `ConfirmDialog` — it currently has no children. Add a `children` prop:
```tsx
<ConfirmDialog
  isOpen={approveDialogOpen}
  onClose={() => { setApproveDialogOpen(false); setApprovalComment('') }}
  onConfirm={() =>
    selectedLeave &&
    actionMutation.mutate({ id: selectedLeave.id, action: 'approve', reason: approvalComment })
  }
  title="Approve Leave Request"
  description={`Approve leave for ${selectedLeave?.employee?.displayName} from ${selectedLeave ? formatDateRange(selectedLeave.startDate, selectedLeave.endDate) : ''}?`}
  confirmLabel="Approve"
  isLoading={actionMutation.isPending}
>
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      Comment <span className="text-slate-400 text-xs">(optional)</span>
    </label>
    <textarea
      value={approvalComment}
      onChange={(e) => setApprovalComment(e.target.value)}
      rows={3}
      className="input w-full"
      placeholder="Add a note for the employee (optional)..."
    />
  </div>
</ConfirmDialog>
```

### 10E. Update the approvals API to accept and store the approval comment

**File:** `src/app/api/manager/approvals/[id]/route.ts`

In the `approve` branch, the comment should be stored as a note. Currently approved leaves don't store a reason. Since there's no `approvalComment` field in the schema, store it in the existing pattern — add it to the audit log details and optionally as a notification message.

Find in the approve branch:
```ts
await prisma.leaveRequest.update({
  where: { id },
  data: {
    status: 'APPROVED',
    approverId: token.userId,
    approvedAt: new Date(),
  },
})
```

This is fine — no schema change needed. The comment is optional and cosmetic.

Update the notification message to include the comment if provided:
```ts
const commentNote = reason ? ` Manager's note: "${reason}"` : ''
await notifyLeaveApproved(leave.employeeId, token.userId, id, dates + commentNote)
```

And update the audit log details:
```ts
await logAudit('LEAVE_APPROVE', token.userId, leave.employeeId, {
  before: { status: 'PENDING' },
  after: { status: 'APPROVED', comment: reason ?? null },
  params: { leaveId: id },
}, req)
```

---

## CHANGE 11 — OUTLOOK ERROR: Remove Outlook calendar integration entirely from calendars to prevent the 500 boot error

The Outlook error shown (`SyntaxError: Failed to execute 'json'...err: Error: 500`) is Outlook Web App's own startup error — it is NOT caused by the HRM application code. However, the calendar pages still attempt to acquire a `Calendars.Read` token via `getGraphCalendarToken`, which triggers a silent token acquisition flow that can interfere with the MSAL session state.

Change 3 already removes the `outlookEvents` query from calendar pages. This is sufficient to stop any MSAL token requests from the calendar pages.

Additionally, remove `Calendars.Read` from the MSAL login scopes to prevent it from being requested during the initial login — this scope is what triggers Outlook's startup issue.

**File:** `src/lib/auth/msalConfig.ts`

**DO NOT CHANGE ANYTHING ELSE IN THIS FILE.**

Find only the `loginRequest` export:
```ts
export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'Calendars.Read', 'offline_access'],
}
```

Remove only `'Calendars.Read'`:
```ts
export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
}
```

This is the minimal and only change to `msalConfig.ts`.

---

## AFTER ALL CHANGES: Commands to run

```bash
# 1. Remove test users from database (run once)
npm run db:cleanup-test

# 2. Regenerate Prisma client
npx prisma generate

# 3. Type check
npx tsc --noEmit

# 4. Start dev server
npm run dev
```

---

## TESTING CHECKLIST

- [ ] Login page: form and button are perfectly centred on all screen sizes; animated ribbon art on the right is unchanged
- [ ] Employee dashboard: Leave Balance card stretches full width (spans 2 columns), numbers visible with more spacing
- [ ] All 3 calendar pages (employee/manager/hr): No Outlook meeting section, no indigo dot in legend, calendar grid still shows holidays and leave dots
- [ ] HR Team Monkstack: "Department" column gone, "Reporting To" column shows manager name, "View →" link navigates correctly without error
- [ ] HR Onboarding: "Reporting To" dropdown shows MANAGER role users; email validation rejects non-`@monikajadhav1907gmail.onmicrosoft.com` emails with inline error; `managerId` saved to DB
- [ ] HR Deboarding: Form is centered on page (matches onboarding layout)
- [ ] No `@moonshine.test` emails visible anywhere in the app (run `npm run db:cleanup-test`)
- [ ] Team Monkstack (employee + HR + manager): availability status updates correctly — on-leave employees show ON_LEAVE, not AVAILABLE
- [ ] Manager dashboard "On Leave Today" counter shows correct count
- [ ] Manager sidebar: "My Team" → "Team Monkstack", "My Projects" → "Ongoing Projects"
- [ ] Manager employees page title: "Team Monkstack"
- [ ] Manager projects page title: "Ongoing Projects"
- [ ] Manager employees table: email is clickable mailto link, search bar is full width
- [ ] Manager approvals: Approve dialog has optional comment textarea; comment is passed to API and reflected in notification/audit

---

*Moonshine LMS — Antigravity Final Touches Prompt — April 2026*
