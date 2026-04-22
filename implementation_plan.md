# Final Implementation Plan: Branded Emails & Azure Sync

This plan implements the branded notification system and correctly maps Azure Entra ID properties to distinguish between **Work Identity** (Login) and **Notification Channel** (Contact).

## User Review Required

> [!IMPORTANT]
> - **Azure Mapping**: Per your clarification, I will map Azure's **`mail`** property (labeled "Email" in Azure properties) to the LMS `notificationEmail` field.
> - **Login Mapping**: The primary login/identity will continue to use the **Work Email** (UPN/Preferred Username).
> - **Sync Behavior**: The `notificationEmail` will sync from Azure on every login but can be manually overridden in the HR dashboard if Azure has no email set.

## Proposed Changes

### [Phase 1] Database & Model Refactor

#### [MODIFY] [schema.prisma](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/prisma/schema.prisma)
- Rename `email` field to `workEmail`.
- Add `notificationEmail String?` field.
- Update unique constraints and indexes.

#### [ACTION] Prisma Migration
- Run `npx prisma migrate dev --name rename_to_work_email`.

#### [MODIFY] [Type Definitions](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/src/types/employee.ts)
- Update interfaces to include `workEmail` and `notificationEmail`.

---

### [Phase 2] Graph & Sync Integration

#### [MODIFY] [graphClient.ts](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/src/lib/auth/graphClient.ts)
- Update `getUserExtendedProfile` to fetch the **`mail`** property from Graph.

#### [MODIFY] [route.ts (Sync)](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/src/app/api/auth/sync/route.ts)
- Update sync logic:
  - `workEmail` = login claims email.
  - `notificationEmail` = Graph's `mail` property.

---

### [Phase 3] Branded Email Overhaul

#### [NEW] [shared.ts](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/src/lib/email/templates/shared.ts)
Branded HTML/CSS wrapper for all communications.

#### [NEW] [getNotificationEmail.ts](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/src/lib/email/getNotificationEmail.ts)
Helper: `(emp) => emp.notificationEmail || emp.workEmail`.

#### [REWRITE] All 5 Notification Templates
- `leaveApplied.ts`
- `leaveApprovedBroadcast.ts`
- `managerOnLeave.ts`
- `leaveStatusUpdate.ts`

---

### [Phase 4] API & UI Integration

#### [MODIFY] All Leave API Routes
Update `apply`, `approvals`, and `revoke` routes to trigger branded emails directed to the resolved notification address.

#### [MODIFY] [HR Employee Detail](file:///c:/Users/monik/Music/Moonshine-LMS-/Moonshine-LMS-/src/app/%28dashboard%29/hr/employees/%5Bid%5D/page.tsx)
- Add "Notification Email" editable field.
- Ensure `workEmail` remains read-only.

## Verification Plan

### Automated Verification
- `npx tsc --noEmit`
- `npx prisma migrate dev`

### Manual Verification
1. **Azure Sync**: Verify that the value in the Azure "Email" property field correctly populates the LMS `notificationEmail`.
2. **Notification Flow**: Apply for a leave and verify the email is sent to the address in `notificationEmail`.
3. **Admin Edit**: Modify the notification email in the HR Dashboard and verify it persists and is used for subsequent notifications.
