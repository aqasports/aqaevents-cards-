# Detailed Audit of Progress against AQA Implementation Prompts

This audit evaluates every prompt previously marked as completed against the real codebase, line-by-line and file-by-file.

---

## PHASE 0 — Fix Now (integrity & trust)

### Prompt 1 — Lock down the public card-purchase endpoint
- **Sub-task 1.1**: Add `PublicPurchaseRequest` model & migration.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L464-L482), [`prisma/migrations/20260727090000_sync_production_schema/migration.sql`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/migrations/20260727090000_sync_production_schema/migration.sql)
- **Sub-task 1.2**: Create `src/modules/purchase-requests/repository.ts` & `service.ts`.
  - **Status**: Done
  - **Evidence**: [`src/modules/purchase-requests/repository.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/purchase-requests/repository.ts), [`src/modules/purchase-requests/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/purchase-requests/service.ts)
- **Sub-task 1.3**: POST `/api/public/cards/[token]/purchase` creates request & sends 6-digit confirmation code.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/cards/[token]/purchase/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/cards/%5Btoken%5D/purchase/route.ts)
- **Sub-task 1.4**: POST `/api/public/cards/[token]/purchase/confirm` endpoint validating code & TTL.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/cards/[token]/purchase/confirm/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/cards/%5Btoken%5D/purchase/confirm/route.ts)
- **Sub-task 1.5**: IP-based rate limiting on confirm route.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/cards/[token]/purchase/confirm/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/cards/%5Btoken%5D/purchase/confirm/route.ts#L17)
- **Sub-task 1.6**: Vitest test file `purchase-confirm.test.ts`.
  - **Status**: Done (4 tests passing)
  - **Evidence**: [`src/app/api/public/cards/[token]/purchase/__tests__/purchase-confirm.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/cards/%5Btoken%5D/purchase/__tests__/purchase-confirm.test.ts)
- **Sub-task 1.7**: Client UI confirmation code step in `event-card-client.tsx`.
  - **Status**: Done
  - **Evidence**: [`src/app/eventscard/[token]/event-card-client.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/eventscard/%5Btoken%5D/event-card-client.tsx)

### Prompt 2 — Require super_admin + audit logging for ledger edits
- **Sub-task 2.1**: `PATCH /api/admin/ledger/[id]` requires `requireSuperAdminSession`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/ledger/[id]/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/ledger/%5Bid%5D/route.ts#L12)
- **Sub-task 2.2**: `updateLedgerEntry` accepts `adminId` & calls `createAudit` ("UPDATE_LEDGER_ENTRY").
  - **Status**: Done
  - **Evidence**: [`src/modules/invoices/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/service.ts#L614)
- **Sub-task 2.3**: `deleteLedgerEntry` logs action "DELETE_LEDGER_ENTRY".
  - **Status**: Done
  - **Evidence**: [`src/modules/invoices/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/service.ts#L644)
- **Sub-task 2.4**: Route handlers pass `session.user.id`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/ledger/[id]/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/ledger/%5Bid%5D/route.ts#L24)
- **Sub-task 2.5**: Vitest test file `ledger.test.ts`.
  - **Status**: Done (2 tests passing)
  - **Evidence**: [`src/modules/invoices/ledger.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/ledger.test.ts)

### Prompt 3 — Audit-log invoice status changes and deletion
- **Sub-task 3.1**: `updateInvoiceWithCredits` calls `createAudit` ("UPDATE_INVOICE_STATUS" / "UPDATE_INVOICE").
  - **Status**: Done
  - **Evidence**: [`src/modules/invoices/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/service.ts#L520)
- **Sub-task 3.2**: `deleteInvoice` calls `createAudit` ("DELETE_INVOICE").
  - **Status**: Done
  - **Evidence**: [`src/modules/invoices/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/service.ts#L560)
- **Sub-task 3.3**: Route handlers thread `adminId` through.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/invoices/[id]/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/invoices/%5Bid%5D/route.ts)
- **Sub-task 3.4**: Tests in `invoice-audit.test.ts`.
  - **Status**: Done (4 tests passing)
  - **Evidence**: [`src/modules/invoices/invoice-audit.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/invoice-audit.test.ts)

### Prompt 4 — Move rate limiting & login lockout to a shared store
- **Sub-task 4.1**: `RateLimitBucket` model & migration.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L483-L488)
- **Sub-task 4.2**: `src/lib/rate-limit.ts` exporting `checkAndIncrement`.
  - **Status**: Done
  - **Evidence**: [`src/lib/rate-limit.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/rate-limit.ts)
- **Sub-task 4.3**: Replace Map-based logic in `auth.ts` and public routes with `checkAndIncrement`.
  - **Status**: Done
  - **Evidence**: [`src/lib/auth.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/auth.ts), [`src/lib/client-auth.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/client-auth.ts)
- **Sub-task 4.4**: Scheduled cleanup of old buckets (>24h).
  - **Status**: Done
  - **Evidence**: [`src/app/api/health/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/health/route.ts#L13)
- **Sub-task 4.5**: Vitest tests in `rate-limit.test.ts`.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/lib/rate-limit.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/rate-limit.test.ts)

### Prompt 5 — Centralize the credit-rate constant
- **Sub-task 5.1**: `PlatformSetting` model seeded with `credit_rate_da = "1900"`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L490-L494)
- **Sub-task 5.2**: `src/lib/settings.ts` exporting `getCreditRate(tx?)` with 60s TTL cache.
  - **Status**: Done
  - **Evidence**: [`src/lib/settings.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/settings.ts)
- **Sub-task 5.3**: Server-side replacement of hardcoded 1900.
  - **Status**: Done
  - **Evidence**: [`src/modules/invoices/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/service.ts)
- **Sub-task 5.4**: Client-side credit rate caching hook (`useCreditRate`) to eliminate repeated fetching.
  - **Status**: Done (Fixed in STEP 2)
  - **Evidence**: [`src/lib/use-credit-rate.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/use-credit-rate.ts), [`src/app/admin/(dashboard)/packages/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/packages/page.tsx)
- **Sub-task 5.5**: Update `src/lib/crm.ts` threshold calculations.
  - **Status**: Done
  - **Evidence**: [`src/lib/crm.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/crm.ts)
- **Sub-task 5.6**: Super-admin settings section in `settings/page.tsx` & `PATCH /api/admin/settings/credit-rate`.
  - **Status**: Done
  - **Evidence**: [`src/app/admin/(dashboard)/settings/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/settings/page.tsx#L230), [`src/app/api/admin/settings/credit-rate/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/settings/credit-rate/route.ts)
- **Sub-task 5.7**: Vitest test file `settings.test.ts`.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/lib/settings.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/settings.test.ts)

### Prompt 6 — Add bot protection to public lead forms
- **Sub-task 6.1**: `verifyTurnstileToken` in `src/lib/captcha.ts`.
  - **Status**: Done
  - **Evidence**: [`src/lib/captcha.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/captcha.ts)
- **Sub-task 6.2**: `turnstileToken` required on public demands/proposals/signup routes.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/demands/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/demands/route.ts), [`src/app/api/public/proposals/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/proposals/route.ts), [`src/app/api/public/signup/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/signup/route.ts)
- **Sub-task 6.3**: Env variables in `.env.example`.
  - **Status**: Done
  - **Evidence**: [`.env.example`](file:///c:/Users/dell/Desktop/aqa%20event/.env.example)
- **Sub-task 6.4**: Render Turnstile widget on public forms.
  - **Status**: Done
  - **Evidence**: [`src/app/demand/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/demand/page.tsx), [`src/app/proposal/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/proposal/page.tsx), [`src/app/signup/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/signup/page.tsx)
- **Sub-task 6.5**: Tests in `captcha.test.ts`.
  - **Status**: Done (4 tests passing)
  - **Evidence**: [`src/lib/captcha.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/captcha.test.ts)

### Prompt 7 — Wire up real notifications
- **Sub-task 7.1**: Email provider integration (`src/lib/email.ts` / Resend).
  - **Status**: Done
  - **Evidence**: [`src/lib/notifications.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/notifications.ts)
- **Sub-task 7.2**: WhatsApp Business API integration (`src/lib/whatsapp.ts`).
  - **Status**: Done
  - **Evidence**: [`src/lib/notifications.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/notifications.ts)
- **Sub-task 7.3**: Rewrite `sendSimulatedNotification` with provider error handling & NotificationLog status.
  - **Status**: Done
  - **Evidence**: [`src/lib/notifications.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/notifications.ts)
- **Sub-task 7.4**: Feature flag `NOTIFICATIONS_MODE`.
  - **Status**: Done
  - **Evidence**: [`src/lib/notifications.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/notifications.ts)
- **Sub-task 7.5**: Tests in `notifications.test.ts`.
  - **Status**: Done (4 tests passing)
  - **Evidence**: [`src/lib/notifications.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/notifications.test.ts)

---

## PHASE 1 — B2B / Organization Layer

### Prompt 8 — Organization data model
- **Sub-task 8.1**: `Organization` model & `Client.organizationId` relation.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L237-L248)
- **Sub-task 8.2**: `src/modules/organizations/` structure (repository.ts, service.ts, validators.ts, types.ts).
  - **Status**: Not Done (Placed in generic `src/lib/organizations.ts` instead of `src/modules/organizations/`).
  - **Evidence**: Missing directory `src/modules/organizations/`
- **Sub-task 8.3**: API routes under `/api/admin/organizations/`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/route.ts), [`src/app/api/admin/organizations/[id]/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/route.ts)
- **Sub-task 8.4**: Client validator & client create/update form dropdowns.
  - **Status**: Done
  - **Evidence**: [`src/modules/clients/validators.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/clients/validators.ts)
- **Sub-task 8.5**: Nav entry "Organizations" in `admin-nav.tsx` & `/admin/organizations/` list/detail UI pages.
  - **Status**: Not Done (No nav entry in `admin-nav.tsx`, no UI page folder `src/app/admin/(dashboard)/organizations/`).
  - **Evidence**: [`src/components/admin/admin-nav.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/components/admin/admin-nav.tsx#L9-L155)
- **Sub-task 8.6**: Tests for organizations service.
  - **Status**: Done (5 tests passing)
  - **Evidence**: [`src/lib/organizations.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/organizations.test.ts)

### Prompt 9 — Bulk employee provisioning for an Organization
- **Sub-task 9.1**: `POST /api/admin/organizations/[id]/bulk-import` (or `/provision`).
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/[id]/provision/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/provision/route.ts)
- **Sub-task 9.2**: Provisioning logic emitting `CLIENT_CREATED`.
  - **Status**: Done
  - **Evidence**: [`src/lib/organizations.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/organizations.ts)
- **Sub-task 9.3**: Per-row result array returned.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/[id]/provision/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/provision/route.ts)
- **Sub-task 9.4**: "Bulk Import Employees" action & CSV upload UI on Organization detail page.
  - **Status**: Not Done (Organization detail page `src/app/admin/(dashboard)/organizations/[id]/page.tsx` missing).
  - **Evidence**: Missing `src/app/admin/(dashboard)/organizations/`
- **Sub-task 9.5**: Audit log entry ("BULK_IMPORT_CLIENTS").
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/[id]/provision/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/provision/route.ts)
- **Sub-task 9.6**: Vitest tests.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/app/api/admin/organizations/[id]/provision/provision.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/provision/provision.test.ts)

### Prompt 10 — Consolidated per-organization invoicing
- **Sub-task 10.1**: `organizationId` & `consolidated` columns on `Invoice`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L218)
- **Sub-task 10.2**: `generateOrganizationStatement` logic.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/[id]/invoices/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/invoices/route.ts)
- **Sub-task 10.3**: `POST /api/admin/organizations/[id]/statements`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/[id]/invoices/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/invoices/route.ts)
- **Sub-task 10.4**: `GET /api/admin/organizations/[id]/statements`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/organizations/[id]/invoices/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/invoices/route.ts)
- **Sub-task 10.5**: Organization detail page "Statements" tab UI.
  - **Status**: Not Done (Organization detail page missing).
  - **Evidence**: Missing `src/app/admin/(dashboard)/organizations/`
- **Sub-task 10.6**: Vitest tests.
  - **Status**: Done (5 tests passing)
  - **Evidence**: [`src/app/api/admin/organizations/[id]/invoices/invoices.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/invoices/invoices.test.ts)

---

## PHASE 2 — Financial Reporting Depth

### Prompt 11 — Coach model (replaces localStorage)
- **Sub-task 11.1**: `Coach`, `CoachAssignment`, `CoachPayout` models in `prisma/schema.prisma`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L250-L262)
- **Sub-task 11.2**: Create `src/modules/coaches/` (repository, service, validators, types).
  - **Status**: Not Done (Placed in `src/lib/coach-payouts.ts` instead of `src/modules/coaches/`).
  - **Evidence**: Missing `src/modules/coaches/`
- **Sub-task 11.3**: API routes under `/api/admin/coaches/`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/coaches/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/coaches/route.ts)
- **Sub-task 11.4**: Rewrite "Coaches", "Reports", "Invoices" tabs in `users/page.tsx` to fetch via API instead of localStorage.
  - **Status**: Not Done (`users/page.tsx` tabs were not rewritten).
  - **Evidence**: [`src/app/admin/(dashboard)/users/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/users/page.tsx)
- **Sub-task 11.5**: Migration script `prisma/migrate-coaches-from-export.js`.
  - **Status**: Not Done (Script file missing).
  - **Evidence**: File does not exist in `prisma/`
- **Sub-task 11.6**: Payout calculation vitest tests.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/lib/coach-payouts.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/coach-payouts.test.ts)

### Prompt 12 — Equipment/Asset model for boats and gear
- **Sub-task 12.1**: `EquipmentAsset` & `EquipmentUsage` models in `prisma/schema.prisma`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L264-L291)
- **Sub-task 12.2**: Create `src/modules/equipment/` (repository, service, validators, types).
  - **Status**: Not Done (Placed in `src/lib/equipment-math.ts` instead of `src/modules/equipment/`).
  - **Evidence**: Missing `src/modules/equipment/`
- **Sub-task 12.3**: API routes under `/api/admin/equipment/`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/equipment/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/equipment/route.ts)
- **Sub-task 12.4**: Nav entry "Equipment" in `admin-nav.tsx` & `/admin/equipment/` list/detail UI page.
  - **Status**: Not Done (No nav entry in `admin-nav.tsx`, no UI page folder `/admin/equipment/`).
  - **Evidence**: [`src/components/admin/admin-nav.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/components/admin/admin-nav.tsx)
- **Sub-task 12.5**: Session detail view "Equipment used" section.
  - **Status**: Not Done (UI section missing).
  - **Evidence**: [`src/app/admin/(dashboard)/activities/[id]/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/activities/%5Bid%5D/page.tsx)
- **Sub-task 12.6**: Vitest tests.
  - **Status**: Done (10 tests passing across 2 files)
  - **Evidence**: [`src/app/api/admin/equipment/equipment.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/equipment/equipment.test.ts), [`src/lib/equipment-math.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/equipment-math.test.ts)

### Prompt 13 — Event/session profitability engine + "Best Event" report
- **Sub-task 13.1**: `getActivityProfitability` math logic.
  - **Status**: Done
  - **Evidence**: [`src/lib/profitability.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/profitability.ts)
- **Sub-task 13.2**: `getBestEvents` wrapper logic.
  - **Status**: Done
  - **Evidence**: [`src/lib/profitability.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/profitability.ts)
- **Sub-task 13.3**: `GET /api/admin/reports/activity-profitability`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/profitability/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/profitability/route.ts)
- **Sub-task 13.4**: Activity profitability sortable table UI on `reports/page.tsx`.
  - **Status**: Not Done (Table UI missing on `reports/page.tsx`).
  - **Evidence**: [`src/app/admin/(dashboard)/reports/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/reports/page.tsx)
- **Sub-task 13.5**: Client customerSegment breakdown chart on `reports/page.tsx`.
  - **Status**: Not Done (Chart UI missing on `reports/page.tsx`).
  - **Evidence**: [`src/app/admin/(dashboard)/reports/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/reports/page.tsx)
- **Sub-task 13.6**: Profitability calculation vitest tests.
  - **Status**: Done (2 tests passing)
  - **Evidence**: [`src/app/api/admin/reports/profitability/profitability.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/profitability/profitability.test.ts)

### Prompt 14 — Invoice statements, exports, and A/R aging report
- **Sub-task 14.1**: `getAccountsReceivableAging()` logic.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/ar-aging/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/ar-aging/route.ts)
- **Sub-task 14.2**: `GET /api/admin/reports/ar-aging`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/ar-aging/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/ar-aging/route.ts)
- **Sub-task 14.3**: Accounts Receivable aging table section on `reports/page.tsx`.
  - **Status**: Not Done (Aging table UI missing on `reports/page.tsx`).
  - **Evidence**: [`src/app/admin/(dashboard)/reports/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/reports/page.tsx)
- **Sub-task 14.4**: PDF export helper `src/lib/invoice-pdf.ts`.
  - **Status**: Done
  - **Evidence**: [`src/lib/invoice-pdf.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/invoice-pdf.ts)
- **Sub-task 14.5**: `GET /api/admin/invoices/[id]/pdf`.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/invoices/[id]/pdf/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/invoices/%5Bid%5D/pdf/route.ts)
- **Sub-task 14.6**: `GET /api/admin/invoices/export` CSV export route.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/invoices/export/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/invoices/export/route.ts)
- **Sub-task 14.7**: "Download PDF" / "Export CSV" buttons on `invoices/page.tsx`.
  - **Status**: Not Done (Export buttons missing on `invoices/page.tsx`).
  - **Evidence**: [`src/app/admin/(dashboard)/invoices/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/invoices/page.tsx)
- **Sub-task 14.8**: Vitest tests.
  - **Status**: Done (6 tests passing across 4 files)
  - **Evidence**: [`src/app/api/admin/reports/ar-aging/ar-aging.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/ar-aging/ar-aging.test.ts), [`src/lib/invoice-pdf.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/invoice-pdf.test.ts)

---

## PHASE 3 — Advertising & Marketing Tooling

### Prompt 15 — Marketing consent + lead attribution
- **Sub-task 15.1**: `marketingConsent` column on `Client` model.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L48)
- **Sub-task 15.2**: Marketing consent checkbox on public & admin signup forms.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/signup/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/signup/route.ts), [`src/app/admin/(dashboard)/clients/new/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/clients/new/page.tsx)
- **Sub-task 15.3**: Capture UTM parameters & referrer on public forms.
  - **Status**: Done
  - **Evidence**: [`src/app/demand/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/demand/page.tsx), [`src/app/api/public/signup/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/signup/route.ts)
- **Sub-task 15.4**: LeadSource breakdown UI section on `reports/page.tsx`.
  - **Status**: Not Done (UI section missing on `reports/page.tsx`).
  - **Evidence**: [`src/app/admin/(dashboard)/reports/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/reports/page.tsx)
- **Sub-task 15.5**: Preserve transactional subscriber notifications.
  - **Status**: Done
  - **Evidence**: [`src/modules/subscribers.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/subscribers.ts)
- **Sub-task 15.6**: Vitest tests in `marketing.test.ts`.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/app/api/public/signup/marketing.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/signup/marketing.test.ts)

### Prompt 16 — Campaign / promo code model
- **Sub-task 16.1**: `CampaignPromo` model in `prisma/schema.prisma`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L379-L391)
- **Sub-task 16.2**: Create `src/modules/campaigns/` (repository, service, validators).
  - **Status**: Not Done (Placed in `src/lib/campaigns.ts` instead of `src/modules/campaigns/`).
  - **Evidence**: Missing `src/modules/campaigns/`
- **Sub-task 16.3**: Wire `validateAndApply` into public purchase & admin recharge flows.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/promo/validate/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/promo/validate/route.ts)
- **Sub-task 16.4**: Admin CRUD UI for campaigns under `/admin/campaigns/`.
  - **Status**: Not Done (UI page folder `/admin/campaigns/` missing).
  - **Evidence**: Missing `src/app/admin/(dashboard)/campaigns/`
- **Sub-task 16.5**: Vitest tests.
  - **Status**: Done (8 tests passing across 2 files)
  - **Evidence**: [`src/lib/campaigns.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/campaigns.test.ts), [`src/app/api/public/promo/promo.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/promo/promo.test.ts)

### Prompt 17 — Ads Manager funnel dashboard
- **Sub-task 17.1**: `getMarketingFunnel` reporting query.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/funnel/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/funnel/route.ts)
- **Sub-task 17.2**: `GET /api/admin/reports/marketing-funnel` (or `/funnel`).
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/funnel/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/funnel/route.ts)
- **Sub-task 17.3**: "Ads Manager" tab/section showing funnel table.
  - **Status**: Not Done (Ads Manager UI section/dashboard missing).
  - **Evidence**: [`src/app/admin/(dashboard)/reports/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/reports/page.tsx)
- **Sub-task 17.4**: Vitest test.
  - **Status**: Done (1 test passing)
  - **Evidence**: [`src/app/api/admin/reports/funnel/funnel.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/funnel/funnel.test.ts)

---

## PHASE 4 — LLM Read-Only Analyst

### Prompt 18 — Read-only DB role + curated AI tool layer
- **Sub-task 18.1**: Document SQL in `prisma/README-ai-role.md` & `AI_DATABASE_URL`.
  - **Status**: Done
  - **Evidence**: [`prisma/README-ai-role.md`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/README-ai-role.md)
- **Sub-task 18.2**: `src/lib/ai-prisma.ts` exporting read-only client.
  - **Status**: Done
  - **Evidence**: [`src/lib/ai-tools.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/ai-tools.ts)
- **Sub-task 18.3**: Curated read functions (`getClientSummary`, `searchClients`, `getAuditTrail`, etc.).
  - **Status**: Done
  - **Evidence**: [`src/lib/ai-tools.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/ai-tools.ts)
- **Sub-task 18.4**: Audit trail for AI query executions.
  - **Status**: Done
  - **Evidence**: [`src/lib/ai-tools.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/ai-tools.ts)
- **Sub-task 18.5**: Redaction of sensitive fields.
  - **Status**: Done
  - **Evidence**: [`src/lib/ai-tools.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/ai-tools.ts)
- **Sub-task 18.6**: Integration tests.
  - **Status**: Done (6 tests passing across 2 files)
  - **Evidence**: [`src/lib/ai-tools.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/ai-tools.test.ts), [`src/app/api/admin/ai/query/ai-query.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/ai/query/ai-query.test.ts)

### Prompt 19 — Weekly insight digest + anomaly detection
- **Sub-task 19.1**: Scheduled function calling AI tool layer.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/anomalies/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/anomalies/route.ts)
- **Sub-task 19.2**: Anomaly detection logic.
  - **Status**: Done
  - **Evidence**: [`src/lib/anomaly-detector.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/anomaly-detector.ts)
- **Sub-task 19.3**: Digest delivery via email integration.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/reports/anomalies/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/anomalies/route.ts)
- **Sub-task 19.4**: `WeeklyDigest` table in `prisma/schema.prisma`.
  - **Status**: Not Done (Table model missing from `prisma/schema.prisma`).
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma)
- **Sub-task 19.5**: "Insights" page under `/admin/insights/`.
  - **Status**: Not Done (UI page folder `/admin/insights/` missing).
  - **Evidence**: Missing `src/app/admin/(dashboard)/insights/`
- **Sub-task 19.6**: Vitest tests.
  - **Status**: Done (4 tests passing across 2 files)
  - **Evidence**: [`src/lib/anomaly-detector.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/anomaly-detector.test.ts), [`src/app/api/admin/reports/anomalies/anomalies.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/reports/anomalies/anomalies.test.ts)

### Prompt 20 — Human-approved write queue for the AI assistant
- **Sub-task 20.1**: `AiActionQueue` model in `prisma/schema.prisma`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L393-L407)
- **Sub-task 20.2**: Create `src/modules/proposed-actions/` (repository, service, validators).
  - **Status**: Not Done (Placed in `/api/admin/ai/queue/` route handlers directly).
  - **Evidence**: Missing `src/modules/proposed-actions/`
- **Sub-task 20.3**: `executeApprovedAction` logic.
  - **Status**: Done
  - **Evidence**: [`src/app/api/admin/ai/queue/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/ai/queue/route.ts)
- **Sub-task 20.4**: Admin UI under `/admin/ai-proposals/`.
  - **Status**: Not Done (UI page folder `/admin/ai-proposals/` missing).
  - **Evidence**: Missing `src/app/admin/(dashboard)/ai-proposals/`
- **Sub-task 20.5**: Vitest tests.
  - **Status**: Done (4 tests passing)
  - **Evidence**: [`src/app/api/admin/ai/queue/ai-queue.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/ai/queue/ai-queue.test.ts)

---

## PHASE 5 — Additional Features

### Prompt 21 — Client self-service login/portal
- **Sub-task 21.1**: Client auth fields (`passwordHash`, etc.).
  - **Status**: Done
  - **Evidence**: [`src/lib/client-auth.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/client-auth.ts)
- **Sub-task 21.2**: Client JWT/session mechanism.
  - **Status**: Done
  - **Evidence**: [`src/lib/client-auth.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/client-auth.ts)
- **Sub-task 21.3**: `/api/client/auth/magic-link` and `/verify-pin` API routes.
  - **Status**: Done
  - **Evidence**: [`src/app/api/client/auth/magic-link/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/client/auth/magic-link/route.ts), [`src/app/api/client/auth/verify-pin/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/client/auth/verify-pin/route.ts)
- **Sub-task 21.4**: Client portal UI route group `src/app/client/(dashboard)/`.
  - **Status**: Not Done (Client UI route group missing).
  - **Evidence**: Missing `src/app/client/`
- **Sub-task 21.5**: Middleware protection for `/client/*` routes.
  - **Status**: Not Done (Middleware rules for `/client/*` missing).
  - **Evidence**: [`src/middleware.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/middleware.ts)
- **Sub-task 21.6**: Vitest tests.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/app/api/client/auth/client-auth.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/client/auth/client-auth.test.ts)

### Prompt 22 — Session waitlists
- **Sub-task 22.1**: `SessionWaitlist` model in `prisma/schema.prisma`.
  - **Status**: Done
  - **Evidence**: [`prisma/schema.prisma`](file:///c:/Users/dell/Desktop/aqa%20event/prisma/schema.prisma#L409-L423)
- **Sub-task 22.2**: Capacity check & waitlist offer on full session.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/sessions/[id]/waitlist/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/sessions/%5Bid%5D/waitlist/route.ts)
- **Sub-task 22.3**: Promotion & notification on redemption cancellation.
  - **Status**: Done
  - **Evidence**: [`src/app/api/public/sessions/[id]/waitlist/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/sessions/%5Bid%5D/waitlist/route.ts)
- **Sub-task 22.4**: Admin UI section on session detail view.
  - **Status**: Not Done (UI section missing).
  - **Evidence**: [`src/app/admin/(dashboard)/activities/[id]/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/activities/%5Bid%5D/page.tsx)
- **Sub-task 22.5**: Vitest tests.
  - **Status**: Done (3 tests passing)
  - **Evidence**: [`src/app/api/public/sessions/[id]/waitlist/waitlist.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/public/sessions/%5Bid%5D/waitlist/waitlist.test.ts)

### Prompt 23 — Automated invoice PDFs emailed to clients/organizations
- **Sub-task 23.1**: `invoice-pdf.ts` helper & email attachment.
  - **Status**: Done
  - **Evidence**: [`src/lib/invoice-pdf.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/invoice-pdf.ts)
- **Sub-task 23.2**: Hook into `createInvoiceWithCredits` & `updateInvoiceWithCredits` as postCommitAction.
  - **Status**: Not Done (Auto-emailing postCommitAction not hooked up).
  - **Evidence**: [`src/modules/invoices/service.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/modules/invoices/service.ts)
- **Sub-task 23.3**: Send organization statements to `Organization.billingContactEmail`.
  - **Status**: Not Done (Automated delivery missing).
  - **Evidence**: [`src/app/api/admin/organizations/[id]/invoices/route.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/api/admin/organizations/%5Bid%5D/invoices/route.ts)
- **Sub-task 23.4**: Per-invoice "Resend invoice email" button on `invoices/page.tsx`.
  - **Status**: Not Done (Button missing on `invoices/page.tsx`).
  - **Evidence**: [`src/app/admin/(dashboard)/invoices/page.tsx`](file:///c:/Users/dell/Desktop/aqa%20event/src/app/admin/%28dashboard%29/invoices/page.tsx)
- **Sub-task 23.5**: Vitest tests.
  - **Status**: Done (1 test passing)
  - **Evidence**: [`src/lib/invoice-pdf.test.ts`](file:///c:/Users/dell/Desktop/aqa%20event/src/lib/invoice-pdf.test.ts)
