# AQA Event Card System — Implementation Prompt Playbook

How to use this: each numbered block below is a **self-contained prompt** you paste directly into Antigravity as its own task/session. They're ordered by dependency, not just priority — don't skip ahead on the schema-changing ones (5, 9, 10) or later prompts will conflict with whatever Antigravity generates first.

Every prompt tells the agent to **match existing repo conventions** (repository/service/validators pattern, `requireAdminSession`/`requireSuperAdminSession`, `eventBus`, audit logging, vitest) instead of inventing new patterns — that's deliberate, keep it in every prompt you write yourself later too.

Run `npm run lint` and `npm run test` after each prompt before moving to the next one.

---

## PHASE 0 — Fix Now (integrity & trust, no schema changes needed for most)

### PROMPT 1 — Lock down the public card-purchase endpoint (fixes audit finding C-1)

```
Context: In src/app/api/public/cards/[token]/purchase/route.ts, anyone holding a
card's publicToken can POST and immediately create an "unpaid" Invoice on that
client's account (package, custom credit, or product), with no confirmation step.
This is exploitable by anyone who has seen the card's QR code, not just the owner.

Task:
1. Add a `pendingConfirmation` concept: instead of BillingService.createInvoiceWithCredits
   writing status "unpaid" directly from this public route, insert the request into
   a new lightweight table `PublicPurchaseRequest` (id, cardId, clientId, type,
   payload JSON, status: "pending_confirmation" | "confirmed" | "expired" | "rejected",
   confirmationCode, expiresAt, createdAt) via a new Prisma migration. Follow the
   existing repository pattern (see src/modules/clients/repository.ts) — create
   src/modules/purchase-requests/repository.ts and service.ts.
2. On POST to the purchase route: validate as today, then instead of creating the
   invoice immediately, create a PublicPurchaseRequest row, generate a 6-digit
   confirmationCode, and call sendSimulatedNotification (src/lib/notifications.ts)
   to the client's phone/email with the code. Return { status: "confirmation_required",
   requestId } to the caller — do NOT create the Invoice yet.
3. Add a new public route POST /api/public/cards/[token]/purchase/confirm that
   accepts { requestId, confirmationCode }, validates the code and expiry
   (10 minute TTL), and only THEN calls billingService.createInvoiceWithCredits
   with the original payload, marking the PublicPurchaseRequest "confirmed".
4. Add the same rate limiting pattern already used in this file (IP-based Map is
   fine here since Prompt 4 below will replace it globally).
5. Add a vitest test file purchase-confirm.test.ts next to the existing
   purchase.test.ts, mocking prisma the same way api-auth.test.ts and
   client.test.ts do, covering: happy path, wrong code, expired request,
   already-confirmed request.
6. Update the client-facing UI at src/app/eventscard/[token]/event-card-client.tsx
   to show a "we sent you a code" step after submitting a purchase, with an input
   for the 6-digit code.

Do not change the existing BillingService.createInvoiceWithCredits signature —
call it exactly as the current route does, just gate the call behind confirmation.
```

### PROMPT 2 — Require super_admin + audit logging for ledger edits (fixes H-1)

```
Context: PATCH /api/admin/ledger/[id]/route.ts only requires requireAdminSession
(any staff role), and BillingService.updateLedgerEntry/deleteLedgerEntry in
src/modules/invoices/service.ts never call reportingRepo.createAudit, unlike every
other money-moving path in this codebase (see the CLIENT_CREATED / PACKAGE_PURCHASED
/ ACTIVITY_REDEEMED / REDEMPTION_DELETED audit listeners in src/modules/subscribers.ts
for the pattern to match).

Task:
1. In src/app/api/admin/ledger/[id]/route.ts, change PATCH to use
   requireSuperAdminSession instead of requireAdminSession (DELETE already uses
   requireSuperAdminSession, leave it).
2. In src/modules/invoices/service.ts, update updateLedgerEntry(id, data) to accept
   an additional adminId: string parameter, and after the update, call
   this.reportingRepo.createAudit with action "UPDATE_LEDGER_ENTRY", target the
   client's name (fetch via entry.clientId), and details showing old delta/reason
   -> new delta/reason.
3. Do the same for deleteLedgerEntry(id, adminId): log action "DELETE_LEDGER_ENTRY"
   with the entry's clientId, old delta, and reason before deleting.
4. Update the route handlers to pass session.user.id through to both service methods.
5. Add/extend tests in a ledger.test.ts colocated with the service (follow the
   mocking style in src/lib/audit.test.ts) asserting createAudit is called with the
   expected action string on both update and delete.

Keep the return shape of both API routes unchanged so the admin UI
(src/app/admin/(dashboard)/clients/[id]/page.tsx, wherever it calls these) keeps working.
```

### PROMPT 3 — Audit-log invoice status changes and deletion (fixes H-2)

```
Context: src/modules/invoices/service.ts — updateInvoiceWithCredits() and
deleteInvoice() both mutate money-relevant state (invoice status, compensating
ledger entries on refund/unpaid reversal) but never call reportingRepo.createAudit,
unlike createPackage/updatePackage/deletePackage in the same file, which do.

Task:
1. In updateInvoiceWithCredits(id, data, adminId): after the prisma.$transaction
   block succeeds, call this.reportingRepo.createAudit with action
   "UPDATE_INVOICE_STATUS" (or "UPDATE_INVOICE" if only non-status fields changed),
   target `Invoice ${invoice.invoiceCode}`, and details summarizing: old status ->
   new status, amount, and whether a compensating ledger entry was created (and
   for how much).
2. In deleteInvoice(id, adminId): before or after the delete transaction, call
   createAudit with action "DELETE_INVOICE", target `Invoice ${invoice.invoiceCode}`,
   details including amount, category, status at time of deletion, and whether a
   refund ledger entry was created.
3. Both service methods already receive or can receive adminId — check the callers
   in src/app/api/admin/invoices/[id]/route.ts (PATCH already passes session.user.id;
   DELETE does too) and thread it through if any internal call site is missing it.
4. Extend the existing test setup (look for any invoices service tests; if none
   exist, create src/modules/invoices/service.test.ts following the vi.mock(prisma)
   pattern from src/lib/balance.test.ts) to assert createAudit fires with the
   correct action string for: mark-paid, mark-refunded, mark-unpaid, and delete.

Do not change the JSON notes-parsing logic already in this file — only add the
audit calls around the existing transaction logic.
```

### PROMPT 4 — Move rate limiting & login lockout to a shared store (fixes H-3)

```
Context: Rate limiting/lockout in src/lib/auth.ts (ipRateCache, lockoutCache) and
every public route's local `rateLimitMap` (src/app/api/public/cards/[token]/route.ts,
purchase/route.ts, checkin/[clubToken]/route.ts, signup/route.ts, demands/route.ts,
proposals/route.ts) use plain in-process Maps. On Netlify Functions these don't
share state across concurrent instances, so the limits are not actually enforced
globally.

Task:
1. Add a new Prisma model RateLimitBucket (key: String @id, count: Int, windowStart:
   DateTime, lockUntil: DateTime?) via a new migration — follow the naming
   convention of existing migrations under prisma/migrations (timestamp_description).
2. Create src/lib/rate-limit.ts exporting:
   - async function checkAndIncrement(key: string, opts: { windowMs: number; max: number; lockoutMs?: number }): Promise<{ limited: boolean; retryAfterSeconds?: number }>
   Implement with a single upsert + conditional logic inside a prisma.$transaction
   (read row, check window/lock, increment or reset, write back) to avoid race
   conditions under concurrent hits. Use the same isSqlite export from src/lib/prisma.ts
   to keep local sqlite dev working (raw upsert via prisma client methods, not raw SQL,
   so it works on both).
3. Replace the ad-hoc Map-based isRateLimited()/isIpRateLimited() logic in ALL of:
   src/lib/auth.ts (isIpRateLimited/recordIpAttempt AND isLockedOut/recordFailedAttempt/
   resetAttempts/getLockoutTimeRemaining), and every public route listed above, with
   calls to checkAndIncrement() using distinct key prefixes (e.g. `login-ip:${ip}`,
   `login-email:${email}`, `purchase:${ip}`, `checkin:${clubToken}:${ip}`, etc.)
   preserving each route's existing thresholds (60/min, 15/min, 120/min, 20 per
   15min, 5 failed attempts) exactly as they are today — this is a storage-layer
   swap, not a policy change.
4. Add a scheduled cleanup: extend netlify.toml's existing "keep-alive" scheduled
   function pattern (or add a new one) to delete RateLimitBucket rows where
   windowStart is older than 24 hours, so the table doesn't grow unbounded.
5. Update src/lib/auth.test.ts and any route tests that currently mock the Map
   behavior to instead mock prisma.rateLimitBucket calls.

Keep all public-facing error messages and status codes (429, retry-after header
on the login route) identical to what they are today — only the storage backend
changes.
```

### PROMPT 5 — Centralize the credit-rate constant (fixes M-1, unblocks B2B pricing)

```
Context: The literal 1900 (DA per credit) is hardcoded in ~15 places across both
server and client code: src/modules/invoices/service.ts (6 occurrences),
src/app/admin/(dashboard)/{invoices,activities/[id]/edit,activities/[id],activities,
clients/[id],products,packages}/page.tsx, src/app/api/public/{cards/[token]/purchase,
demands}/route.ts, src/app/demand/page.tsx, src/app/eventscard/[token]/{page.tsx,
event-card-client.tsx}. src/lib/crm.ts also hardcodes 19000/38000 as separate magic
numbers for VIP/High-Value thresholds, which are actually just 10x/20x the credit rate.

Task:
1. Add a PlatformSetting model (or reuse if one already exists after other prompts)
   with key/value string pairs, seeded with `credit_rate_da = "1900"`. Use a Prisma
   migration.
2. Create src/lib/settings.ts exporting `async function getCreditRate(tx?): Promise<number>`
   that reads from PlatformSetting with an in-process cache (60s TTL is fine, this
   value changes rarely) and a hardcoded fallback of 1900 if the row is missing
   (so existing dev/test environments don't break).
3. Replace every hardcoded `1900` in the server-side files listed above with
   `await getCreditRate()`. For the client-side (.tsx) occurrences, do NOT call
   getCreditRate() from the browser — instead have the relevant API responses
   (e.g. GET /api/public/packages, GET /api/admin/packages, the card lookup
   endpoints) include a `creditRate` field, and update each page component to read
   the rate from that response instead of the literal 1900. List every file you
   change and confirm none still contain a bare `1900` literal used for pricing
   math (grep for it before finishing).
4. Update src/lib/crm.ts to compute the VIP/High-Value thresholds as
   `10 * creditRate` / `20 * creditRate` (confirm with me these multipliers are
   correct before hardcoding a different formula — if unsure, keep 19000/38000 as
   named constants `HIGH_VALUE_THRESHOLD_DA`/`VIP_THRESHOLD_DA` for now rather than
   guessing the relationship).
5. Add a super_admin-only settings UI section in
   src/app/admin/(dashboard)/settings/page.tsx to view/edit the credit rate, calling
   a new PATCH /api/admin/settings/credit-rate route (requireSuperAdminSession),
   which must call reportingRepo.createAudit on change.
6. Add tests confirming getCreditRate() returns the seeded value and falls back
   correctly, and that changing it via the API updates subsequent calculations.

This is foundational for Prompt 9 (Organization-level negotiated pricing) — do not
skip the "read from API response" step for client components, since Prompt 9 will
need per-organization overrides to flow through the same path.
```

### PROMPT 6 — Add bot protection to public lead forms (fixes M-2)

```
Context: src/app/api/public/{demands,proposals}/route.ts and src/app/api/public/signup/route.ts
are fully open, wildcard-CORS, unauthenticated forms with only IP rate limiting.
As these become the intake queue for B2B leads, spam here becomes a real cost.

Task:
1. Add Cloudflare Turnstile (free tier) verification: create src/lib/turnstile.ts
   exporting `async function verifyTurnstileToken(token: string): Promise<boolean>`
   that POSTs to https://challenges.cloudflare.com/turnstile/v0/siteverify with
   TURNSTILE_SECRET_KEY from env.
2. Add `turnstileToken` as a required field to the request bodies of
   src/app/api/public/demands/route.ts, src/app/api/public/proposals/route.ts, and
   src/app/api/public/signup/route.ts. Reject with 400 if verification fails, before
   doing any DB writes.
3. Add TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY to .env.example and
   .env.production.example with a comment explaining they're from the Cloudflare
   dashboard.
4. Update the corresponding public-facing forms (src/app/demand/page.tsx and
   wherever the proposal/signup forms live under src/app or public/) to render the
   Turnstile widget and include the token in their submit payload.
5. Do not add Turnstile to src/app/api/public/checkin/[clubToken]/route.ts or the
   card purchase route — those are used from a physical terminal/QR flow where a
   CAPTCHA would break the UX; leave the rate limiting from Prompt 4 as the control
   there.
```

### PROMPT 7 — Wire up real notifications (fixes M-3, prerequisite for Phase 3)

```
Context: src/lib/notifications.ts's sendSimulatedNotification() only console.logs
and writes a NotificationLog row with status "sent" — nothing has ever actually
been delivered to a client. Every welcome message, balance update, and admin alert
in src/modules/subscribers.ts calls this function.

Task:
1. Add an email provider integration (use Resend — simplest API, good Node SDK).
   Add RESEND_API_KEY to env files. Create src/lib/email.ts wrapping the Resend
   client with a single `sendEmail(to, subject, html)` function.
2. Add a WhatsApp Business API (Meta Cloud API) integration for SMS/WhatsApp-style
   messages, given the Algerian client base. Create src/lib/whatsapp.ts wrapping
   the Graph API send-message endpoint. Add WHATSAPP_ACCESS_TOKEN and
   WHATSAPP_PHONE_NUMBER_ID to env files.
3. Rewrite sendSimulatedNotification in src/lib/notifications.ts (keep the same
   function signature so none of the ~10 call sites in src/modules/subscribers.ts
   need to change) to:
   - call sendEmail() when type === "email"
   - call the WhatsApp sender when type === "sms" or "whatsapp"
   - on provider failure, catch the error, still write the NotificationLog row but
     with status "failed" and store the error message in a new `errorDetail` column
     (add via migration), and don't let a notification failure roll back the
     surrounding business transaction (these are called as postCommitActions
     already in subscribers.ts, confirm that's preserved).
4. Add a feature flag NOTIFICATIONS_MODE=simulated|live in env (default "simulated"
   for local dev / tests) so `npm run test` and local development don't require
   real API keys — when not "live", keep the current console.log + "sent" behavior
   exactly as-is.
5. Add tests mocking the Resend/WhatsApp clients (do not hit real APIs in tests)
   covering: successful send, provider error handled gracefully, simulated mode
   unchanged.
6. Do not touch the calling code in src/modules/subscribers.ts at all — this
   prompt is scoped to the notification delivery layer only.
```

---

## PHASE 1 — B2B / Organization Layer

### PROMPT 8 — Organization data model

```
Context: There is no company/organization concept anywhere in prisma/schema.prisma.
Every Client is priced and invoiced individually. We need a B2B layer before any
convention onboarding: negotiated pricing, a billing contact, contract dates, and
a link from employee Clients back to their company.

Task:
1. Add to prisma/schema.prisma a new model:
   model Organization {
     id                String    @id @default(cuid())
     name              String
     billingContactName  String?
     billingContactEmail String?
     billingContactPhone String?
     taxId             String?
     creditRateOverride Int?     // DA per credit; null = use global getCreditRate()
     paymentTermsDays  Int       @default(30)
     status            String    @default("prospect") // prospect | active | suspended
     contractStartDate DateTime?
     contractEndDate   DateTime?
     contractFileUrl   String?
     notes             String?
     createdAt         DateTime  @default(now())
     updatedAt         DateTime  @updatedAt

     clients Client[]
     @@index([status])
   }
   Add `organizationId String?` and `organization Organization? @relation(...)`
   (onDelete: SetNull) to the existing Client model. Generate the migration.
2. Create src/modules/organizations/ following the exact structure of
   src/modules/clients/ (repository.ts, service.ts, validators.ts, types.ts):
   - repository.ts: thin CRUD wrapper (see src/modules/clients/repository.ts as
     the template — findMany/findUnique/findFirst/create/update/delete/count, all
     accepting an optional tx).
   - validators.ts: createOrganizationSchema / updateOrganizationSchema with zod,
     mirroring the style in src/modules/clients/validators.ts.
   - service.ts: OrganizationsService with getOrganizations(), getOrganization(id)
     (include a count of linked clients and sum of their outstanding balance),
     createOrganization(data, adminId) and updateOrganization(id, data, adminId)
     — both must call reportingRepo.createAudit (actions "CREATE_ORGANIZATION" /
     "UPDATE_ORGANIZATION"), following the exact pattern used in
     BillingService.createPackage in src/modules/invoices/service.ts.
3. Create API routes under src/app/api/admin/organizations/ (route.ts for
   GET/POST, [id]/route.ts for GET/PATCH/DELETE), using requireAdminSession for
   reads and requireSuperAdminSession for create/update/delete — match the
   authorization pattern surveyed across src/app/api/admin/clubs/route.ts.
4. Add `organizationId` as an optional field to createClientSchema/updateClientSchema
   in src/modules/clients/validators.ts, and to the client create/update forms in
   src/app/admin/(dashboard)/clients/new/page.tsx and clients/[id]/page.tsx (a
   dropdown to link a client to an org).
5. Add a new admin nav entry "Organizations" in src/components/admin/admin-nav.tsx
   and a list/detail page under src/app/admin/(dashboard)/organizations/ following
   the layout conventions of src/app/admin/(dashboard)/clubs/page.tsx and
   clubs/[id]/page.tsx (list + detail-with-tabs pattern).
6. Write tests for the service layer following src/app/api/admin/clients/[id]/client.test.ts's
   mocking approach.

Do not implement consolidated invoicing or bulk CSV import yet — those are
Prompts 9 and 10. This prompt is schema + basic CRUD only.
```

### PROMPT 9 — Bulk employee provisioning for an Organization

```
Context: Depends on Prompt 8 (Organization model must exist). Onboarding a
company today means creating each employee Client one-by-one through the signup
form. CardsService.generatePrebatch (src/modules/cards/service.ts) already does
bulk card generation for blank cards — extend that pattern for org rosters.

Task:
1. Add POST /api/admin/organizations/[id]/bulk-import (requireAdminSession),
   accepting a CSV file upload (multipart/form-data) or a JSON array of
   { fullName, email?, phone? }.
2. In OrganizationsService (or a new method on ClientsService in
   src/modules/clients/service.ts — pick whichever keeps clientsRepo/cardsRepo
   dependencies cleanest, but keep it consistent with how CLIENT_CREATED is
   emitted elsewhere), for each row:
   - create the Client with organizationId set,
   - emit EVENTS.CLIENT_CREATED via eventBus exactly as the existing single-client
     creation path does in src/modules/clients/service.ts (so card issuance, audit
     logging, and notifications all fire consistently) — do NOT duplicate that
     logic, reuse the existing event.
   - wrap the whole batch in a single prisma.$transaction with a reasonable
     timeout (see CardsService.generatePrebatch's `{ timeout: 60000 }` pattern for
     precedent) OR process in chunks of ~25 with individual transactions if the
     roster could be large (500+) — decide based on typical B2B roster size and
     document your choice in a comment.
3. Return a per-row result array ({ row, success, clientId? , error? }) so partial
   failures (duplicate email, invalid phone) are visible without failing the whole
   batch.
4. Add a "Bulk Import Employees" action on the Organization detail page (built in
   Prompt 8) with a CSV upload UI and a results table showing the per-row outcome.
5. Add an audit log entry (action "BULK_IMPORT_CLIENTS") summarizing count
   succeeded/failed for the organization.
6. Add tests covering: all-success batch, partial failure (one bad row doesn't
   sink the others if you chose chunked transactions — assert accordingly), and
   duplicate-email handling.

If you decide the all-or-nothing single transaction is safer for data integrity
even at the cost of an all-or-nothing failure mode, that's an acceptable choice —
just make sure the UI error message is honest about which behavior was implemented.
```

### PROMPT 10 — Consolidated per-organization invoicing

```
Context: Depends on Prompts 5 (centralized credit rate) and 8 (Organization
model). Today every Invoice belongs to a single Client. B2B partners will expect
one monthly statement per company, not one invoice per employee.

Task:
1. Add `organizationId String?` + relation to the Invoice model in
   prisma/schema.prisma (nullable — individual-client invoices keep organizationId
   null). Migration.
2. Add a new method to BillingService (src/modules/invoices/service.ts):
   generateOrganizationStatement(organizationId, periodStart, periodEnd, adminId):
   - Query all Invoices for Clients belonging to this Organization within the
     period (paid + unpaid, exclude already-consolidated ones — add a boolean
     `consolidated` column to Invoice via the same migration to track this).
   - Create one new "rollup" Invoice row with organizationId set, category
     "org_statement", amount = sum of the underlying invoices, items = a
     human-readable breakdown (JSON list of { clientName, invoiceCode, amount }),
     status "unpaid", and mark all underlying invoices `consolidated = true`
     (they keep their own status/history — this is a summary layer, not a
     replacement).
   - Respect Organization.creditRateOverride if set when any new charges are
     computed as part of this (most amounts here are just summing existing
     invoices, so this mainly matters if you add proration — keep it simple:
     this method summarizes existing invoice amounts, it does not recompute
     pricing).
   - Call reportingRepo.createAudit with action "GENERATE_ORG_STATEMENT".
3. Add POST /api/admin/organizations/[id]/statements (requireAdminSession) with
   body { periodStart, periodEnd } calling the method above.
4. Add GET /api/admin/organizations/[id]/statements to list past statements.
5. On the Organization detail page (from Prompt 8), add a "Statements" tab: a
   date-range picker, "Generate Statement" button, and a list of past statements
   with drill-down to the underlying invoice breakdown.
6. This does not need PDF export yet — that's Prompt 18. Keep this prompt scoped
   to the data model and generation logic.
7. Tests: generating a statement marks the right invoices consolidated, doesn't
   double-count on a second run for the same period, and the summed amount
   matches the underlying invoices exactly.
```

---

## PHASE 2 — Financial Reporting Depth

### PROMPT 11 — Coach model (replaces localStorage, fixes audit finding C-2)

```
Context: Coach management, session assignments, and payout history currently
live ONLY in browser localStorage in src/app/admin/(dashboard)/users/page.tsx
(keys "aqa_coaches", "aqa_coach_assignments", "aqa_coach_payouts") — see the
Coach/CoachAssignment/CoachPayout/CoachPayoutSession TypeScript interfaces
already defined at the top of that file, which describe the shape we want in
the database. None of this is backed up, shared across admins, or queryable.

Task:
1. Add to prisma/schema.prisma, using the existing TS interfaces in
   src/app/admin/(dashboard)/users/page.tsx as your field reference:
   model Coach {
     id                String   @id @default(cuid())
     name              String
     type              String   @default("coach") // coach | staff
     email             String?
     phone             String?
     baseRate          Int      @default(0) // DA per session
     bonusPerAttendee  Int      @default(0) // DA per attendee
     notes             String?
     active            Boolean  @default(true)
     createdAt         DateTime @default(now())

     assignments CoachAssignment[]
     payouts     CoachPayout[]
   }
   model CoachAssignment {
     id         String          @id @default(cuid())
     coachId    String
     sessionId  String          // references ActivitySession.id
     createdAt  DateTime        @default(now())
     coach      Coach           @relation(fields: [coachId], references: [id], onDelete: Cascade)
     session    ActivitySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
     @@unique([coachId, sessionId])
     @@index([sessionId])
   }
   model CoachPayout {
     id            String   @id @default(cuid())
     coachId       String
     invoiceCode   String   @unique // e.g. PAY-COACH-1689230
     startDate     DateTime
     endDate       DateTime
     sessionsJson  String   // serialized CoachPayoutSession[] snapshot at payout time
     totalAmount   Int
     status        String   @default("unpaid") // paid | unpaid
     notes         String?
     createdAt     DateTime @default(now())
     paidAt        DateTime?
     coach         Coach    @relation(fields: [coachId], references: [id], onDelete: Restrict)
     @@index([coachId])
   }
   Add `coachAssignments CoachAssignment[]` back-relation on ActivitySession.
   Generate the migration.
2. Create src/modules/coaches/ (repository.ts, service.ts, validators.ts, types.ts)
   following the exact structure of src/modules/clients/. CoachesService needs:
   - CRUD for Coach (createCoach/updateCoach must call reportingRepo.createAudit,
     matching BillingService.createPackage's pattern)
   - assignCoachToSession(coachId, sessionId) / unassignCoach(assignmentId)
   - generatePayout(coachId, startDate, endDate, adminId): find all
     CoachAssignments for this coach whose session.sessionDate falls in range,
     for each compute attendees = count of Redemptions for that session (query
     via prisma.redemption.count({ where: { sessionId } })), totalPay =
     baseRate + bonusPerAttendee * attendees, sum across sessions, create the
     CoachPayout row with sessionsJson storing the per-session breakdown, generate
     invoiceCode with the "PAY-COACH-" prefix seen in the current localStorage
     interface, and call createAudit ("GENERATE_COACH_PAYOUT").
   - markPayoutPaid(payoutId, adminId) — simple status update + audit log.
3. Add API routes under src/app/api/admin/coaches/ (route.ts, [id]/route.ts,
   [id]/assignments/route.ts, [id]/payouts/route.ts) with requireAdminSession
   for reads/assignment, requireSuperAdminSession for payout generation/marking
   paid (this touches money, match the ledger/invoice authorization level).
4. Rewrite the "Coaches", "Reports", and "Invoices" tabs in
   src/app/admin/(dashboard)/users/page.tsx to fetch/write through these new API
   routes instead of localStorage — remove all localStorage.getItem/setItem calls
   for "aqa_coaches"/"aqa_coach_assignments"/"aqa_coach_payouts" entirely. Keep the
   existing UI layout/styling, just swap the data layer. The DatabaseSession
   interface and session-loading logic already in that file (loading real sessions
   from the DB to link to coaches) can stay as-is.
5. Write a one-time migration script (prisma/seed-missing.mjs already exists as a
   precedent for ad-hoc data scripts — add a sibling script
   prisma/migrate-coaches-from-export.js) that accepts a JSON export of what was in
   localStorage (ask the user to paste their browser's localStorage values) and
   inserts it into the new tables, so existing coach data isn't lost when this
   ships. Document how to run it in the script's header comment.
6. Add tests for CoachesService.generatePayout covering the attendee-counting and
   pay calculation logic specifically, since that's the part most likely to have
   an off-by-one or double-count bug.
```

### PROMPT 12 — Equipment/Asset model for boats and gear

```
Context: There is no representation of boats or rentable/owned equipment
anywhere in the schema — "boats bill" in the business's reporting ask has no
underlying data to report on at all. Activity.equipment is just a JSON string
field on the activity description, not structured, trackable data.

Task:
1. Add to prisma/schema.prisma:
   model Equipment {
     id              String   @id @default(cuid())
     name            String
     type            String   // "boat" | "gear" | "vehicle" | other
     costPerUse      Int      @default(0) // DA, flat cost each time it's assigned to a session
     maintenanceNotes String?
     active          Boolean  @default(true)
     createdAt       DateTime @default(now())
     usageLogs EquipmentUsageLog[]
   }
   model EquipmentUsageLog {
     id           String          @id @default(cuid())
     equipmentId  String
     sessionId    String
     cost         Int             // snapshot of costPerUse at time of assignment (or override)
     notes        String?
     createdAt    DateTime        @default(now())
     equipment    Equipment       @relation(fields: [equipmentId], references: [id], onDelete: Restrict)
     session      ActivitySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
     @@index([sessionId])
     @@index([equipmentId])
   }
   Add `equipmentUsage EquipmentUsageLog[]` back-relation on ActivitySession.
   Generate the migration.
2. Create src/modules/equipment/ (repository.ts, service.ts, validators.ts,
   types.ts) following the src/modules/clients/ structure exactly. Service needs
   CRUD for Equipment (audit-logged on create/update, matching the package
   pattern) and assignToSession(equipmentId, sessionId, costOverride?) /
   removeFromSession(usageLogId).
3. Add API routes under src/app/api/admin/equipment/ mirroring
   src/app/api/admin/expenses/route.ts's authorization level (requireAdminSession
   for CRUD, since ActivityExpense — the closest existing analog — uses that
   level too).
4. Add an "Equipment" admin nav entry and list/detail page under
   src/app/admin/(dashboard)/equipment/, following the layout of
   src/app/admin/(dashboard)/activities/page.tsx (simple list + create/edit modal).
5. On the existing session detail view (wherever ActivitySession expenses are
   managed today — check src/app/api/admin/sessions/[id]/expenses/route.ts and
   its corresponding UI), add an "Equipment used" section to assign
   Equipment to that session the same way SessionExpense is currently attached,
   so it appears alongside session-level costs in the UI.
6. Tests: assigning equipment creates a usage log with the right cost snapshot,
   and removing it deletes the log without affecting the Equipment record itself.
```

### PROMPT 13 — Event/session profitability engine + "Best Event" report

```
Context: Depends on Prompts 11 and 12 (Coach payouts and Equipment usage need to
exist as real, queryable data for this to be complete — if those haven't shipped
yet, build this prompt with coach/equipment cost as $0 placeholders and note
clearly in a code comment where to plug them in later). ReportingService
(src/modules/reports/service.ts) currently only has system-wide totals — nothing
broken down per activity or session, and ActivityExpense/SessionExpense are
tracked but never joined against revenue.

Task:
1. Add to ReportingService (src/modules/reports/service.ts):
   async getActivityProfitability(dateRange?: { from: Date; to: Date }): For each
   active Activity, compute:
   - revenue = sum of (Redemption.creditsUsed * creditRate) for redemptions in
     range, using getCreditRate() from src/lib/settings.ts (Prompt 5) — note DA
     revenue is an approximation since credits paid for at a discount (bonus
     credits) technically cost the business less per redemption; add a comment
     explaining this simplification rather than silently treating it as exact.
   - directCosts = sum of ActivityExpense.amount for that activity (one-time,
     not date-ranged unless you choose to also range-filter these — decide and
     document) + sum of SessionExpense.amount for that activity's sessions in range
   - coachCosts = sum of CoachPayout.totalAmount attributable to this activity's
     sessions in range (join through CoachAssignment -> ActivitySession ->
     Activity)
   - equipmentCosts = sum of EquipmentUsageLog.cost for this activity's sessions
     in range
   - profit = revenue - directCosts - coachCosts - equipmentCosts
   - margin = profit / revenue (handle revenue = 0)
   Return an array sorted by profit desc, each row including activityId, name,
   revenue, each cost component broken out (don't just return the total — the
   audit specifically asked to see "coachs bill" and "boats bill" separately),
   profit, margin, redemptionCount.
2. Add getBestEvents(dateRange?, sortBy: "profit" | "volume" | "margin" = "profit")
   as a thin wrapper/sort over the same underlying data, since the audit noted
   these three rankings often disagree and all three should be visible.
3. Add GET /api/admin/reports/activity-profitability (requireAdminSession) with
   query params for date range and sortBy, calling the above.
4. On src/app/admin/(dashboard)/reports/page.tsx, add a new section: a sortable
   table of activities with revenue / direct costs / coach costs / equipment costs
   / profit / margin columns, and a toggle for the three "best event" sort modes.
5. Also surface Client.customerSegment (VIP/High-Value/Inactive/Standard, computed
   in src/lib/crm.ts but never displayed anywhere) as a simple breakdown chart
   (count of clients per segment) on the same reports page — this is a cheap
   addition since the data already exists.
6. Write tests for the profitability calculation with a hand-constructed fixture
   (a few redemptions, expenses, coach payouts, equipment logs) and assert the
   exact expected revenue/cost/profit numbers — this calculation is the crux of
   the whole feature, get the test coverage right before wiring up the UI.
```

### PROMPT 14 — Invoice statements, exports, and A/R aging report

```
Context: Invoices today are only a flat filterable list plus system-wide totals
(BillingService.getInvoicesWithStats in src/modules/invoices/service.ts). No
export, no aging report for unpaid invoices — increasingly important once
Organization-level net-30 terms (Prompt 8) exist.

Task:
1. Add getAccountsReceivableAging() to BillingService: query all Invoices with
   status "unpaid", bucket by (now - createdAt) into "0-30", "30-60", "60+" days,
   grouped by Client (and Organization if organizationId is set, from Prompt 10),
   summing amount per bucket. Return per-client/org rows plus bucket totals.
2. Add GET /api/admin/reports/ar-aging (requireAdminSession).
3. Add an "Accounts Receivable" section to src/app/admin/(dashboard)/reports/page.tsx
   showing the aging buckets as a table, with rows clickable through to the
   client/organization's invoice history.
4. Add PDF export for a single invoice: create src/lib/invoice-pdf.ts using the
   jspdf dependency already in package.json (check how it's currently used for
   card printing, e.g. in src/app/admin/(dashboard)/print/page.tsx, for the
   existing jsPDF usage pattern in this repo before writing new code) to render
   an invoice with AQA branding, client/organization name, line items from
   Invoice.items, amount, status, dates.
5. Add GET /api/admin/invoices/[id]/pdf (requireAdminSession) returning the PDF
   as a download.
6. Add CSV export for the filtered invoice list: GET /api/admin/invoices/export
   (requireAdminSession) accepting the same search/status query params as the
   existing GET /api/admin/invoices/route.ts, streaming a CSV.
7. Add "Download PDF" / "Export CSV" buttons to the existing
   src/app/admin/(dashboard)/invoices/page.tsx.
8. Tests: aging bucket boundaries (an invoice exactly at 30 days lands in the
   right bucket — check off-by-one carefully), and that PDF/CSV generation
   doesn't throw on an invoice with unusual `items`/`notes` content (e.g. the
   JSON-encoded notes used for package/product purchases elsewhere in this repo).
```

---

## PHASE 3 — Advertising & Marketing Tooling

### PROMPT 15 — Marketing consent + lead attribution

```
Context: Depends on Prompt 7 (real notifications) being done or in progress —
don't build a promotional channel without a working delivery layer. Client.leadSource
already exists in the schema but nothing ever sets it; there's also no
opt-in/consent flag distinguishing transactional messages (already sent today)
from promotional ones (which providers and good practice require explicit consent
for).

Task:
1. Add `marketingOptIn Boolean @default(false)` to the Client model via migration.
2. Add a marketing consent checkbox (unchecked by default, clearly labeled,
   separate from any required transactional consent) to every public
   client-creation touchpoint: src/app/api/public/signup/route.ts's form, and the
   admin-side client creation form in src/app/admin/(dashboard)/clients/new/page.tsx.
   Thread the value through createClientSchema in src/modules/clients/validators.ts.
3. Capture lead attribution: on the public forms at src/app/demand/page.tsx and
   the signup page, read `utm_source`/`utm_medium`/`utm_campaign` query params (or
   document referrer if absent) client-side on page load, store them in a hidden
   form field, and pass through to the existing `leadSource` field already
   accepted by src/app/api/public/signup/route.ts and src/modules/clients/validators.ts
   (store as a compact string like "utm:instagram/paid/summer2026" or "referrer:google.com").
4. Add a simple breakdown by leadSource to the reports page (count of clients and
   sum of totalSpent grouped by leadSource) — this is the "which channel brings
   paying clients" view referenced in the audit, and it's nearly free once the
   data is being captured.
5. In src/modules/subscribers.ts's notification listeners, do not change
   transactional messages (welcome, balance updates) — those are fine as-is and
   don't require marketingOptIn. This prompt only adds the flag and attribution
   capture; Prompt 16/17 will be the first things that actually check
   marketingOptIn before sending.
```

### PROMPT 16 — Campaign / promo code model

```
Context: Depends on Prompts 5 (centralized credit rate) and 15 (consent flag).
No promo/coupon concept exists — discounts today would have to be done manually
per invoice.

Task:
1. Add to prisma/schema.prisma:
   model Campaign {
     id            String   @id @default(cuid())
     code          String   @unique
     description   String?
     discountType  String   // "percent" | "flat_da" | "bonus_credits"
     discountValue Int      // percent (0-100), DA amount, or extra credits depending on type
     packageId     String?  // optional: restrict to one package
     activityId    String?  // optional: restrict to one activity
     maxUses       Int?     // null = unlimited
     usedCount     Int      @default(0)
     expiresAt     DateTime?
     active        Boolean  @default(true)
     createdAt     DateTime @default(now())
     package  Package?  @relation(fields: [packageId], references: [id], onDelete: SetNull)
     activity Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
   }
   Add back-relations on Package and Activity. Generate the migration.
2. Create src/modules/campaigns/ (repository.ts, service.ts, validators.ts)
   following the src/modules/clients/ structure. Service needs CRUD
   (audit-logged) plus validateAndApply(code, context: { packageId?, activityId?,
   amount }): checks active/expiresAt/maxUses/usedCount and package/activity
   restriction, returns the discounted amount without mutating anything; a
   separate recordUse(campaignId, tx) increments usedCount and must be called
   inside the same transaction as the invoice creation that used the code, to
   avoid a race where two simultaneous redemptions both pass a maxUses check.
3. Wire validateAndApply into the public purchase flow
   (src/app/api/public/cards/[token]/purchase/route.ts, after Prompt 1's
   confirmation step) and the admin recharge flow
   (BillingService.rechargeCredits in src/modules/invoices/service.ts) as an
   optional `campaignCode` field, applying the discount to the invoice amount
   before it's created.
4. Add admin CRUD UI for campaigns under src/app/admin/(dashboard)/campaigns/,
   following the layout of src/app/admin/(dashboard)/packages/page.tsx.
5. Tests: discount math for all three discountType values, maxUses enforcement
   under concurrent use (simulate two calls to validateAndApply+recordUse against
   a campaign with maxUses=1 and confirm only one succeeds), and expired-campaign
   rejection.
```

### PROMPT 17 — Ads Manager funnel dashboard

```
Context: Depends on Prompts 15 (attribution capture) and 16 (campaigns). No
funnel visibility exists connecting marketing spend/channel to actual revenue.

Task:
1. Add getMarketingFunnel(dateRange?) to ReportingService: for each distinct
   leadSource value present on Client, compute: count of clients created in
   range, count who have at least one paid Invoice, sum of totalSpent, and if a
   campaignCode pattern is embedded in leadSource or tracked separately, join
   against Campaign.usedCount for a redemption-rate view. Keep this
   straightforward — a funnel table (source -> signups -> paying clients ->
   revenue), not a full attribution model.
2. Add GET /api/admin/reports/marketing-funnel (requireAdminSession).
3. Add an "Ads Manager" tab or section to the reports page (or its own nav
   entry, your call — check whether src/components/admin/admin-nav.tsx is
   getting crowded and decide) showing the funnel table above, sortable by
   revenue and by conversion rate (paying clients / total signups).
4. Do not build pixel/impression tracking on the public landing pages
   (public/landing.html, public/hero.html) in this prompt — that requires
   picking an analytics provider and is a separate, smaller follow-up once this
   internal-data funnel view is in place and the team has decided whether they
   need pre-signup (impression-level) data too.
```

---

## PHASE 4 — LLM Read-Only Analyst

### PROMPT 18 — Read-only DB role + curated AI tool layer

```
Context: This is a security-critical prompt — the goal is to make the AI
assistant PHYSICALLY unable to write to the database, not just instructed not
to, per the platform's explicit "read-only until we allow that" rule.

Task:
1. Document (in a new prisma/README-ai-role.md, since this step happens at the
   Postgres level and can't be run through Prisma migrations) the exact SQL to
   run once against the production database:
   CREATE ROLE aqa_ai_readonly WITH LOGIN PASSWORD '...';
   GRANT CONNECT ON DATABASE <dbname> TO aqa_ai_readonly;
   GRANT USAGE ON SCHEMA public TO aqa_ai_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO aqa_ai_readonly;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO aqa_ai_readonly;
   Explicitly confirm no INSERT/UPDATE/DELETE/TRUNCATE/CREATE grants are given.
   Add AI_DATABASE_URL to env files pointing at this role's connection string.
2. In src/lib/prisma.ts's pattern, create src/lib/ai-prisma.ts exporting a second
   PrismaClient instance constructed with AI_DATABASE_URL instead of DATABASE_URL
   — this is the ONLY Prisma client the AI tool layer is allowed to import.
3. Create src/modules/ai-tools/ with a set of narrow, purpose-built read
   functions (NOT raw SQL execution) built on ai-prisma, e.g.:
   - getClientSummary(clientId): profile + balance + recent redemptions/invoices
   - searchClients(query): name/email/phone search, capped at 20 results
   - getActivityProfitability(dateRange): reuse the query logic from Prompt 13
     but via the ai-prisma client
   - getOverdueInvoices(orgId?): reuse Prompt 14's aging logic
   - getAuditTrail(filters): read AuditLog for anomaly-spotting
   Each function must have a hard result-size cap and a timeout, since this
   layer must never allow an expensive unbounded query.
4. Add an AI_QUERY audit trail: wrap every ai-tools function call in a logger
   that writes to AuditLog (reuse reportingRepo.createAudit, but note this write
   happens through the REGULAR prisma client, not ai-prisma — the read-only
   client only ever reads) with action "AI_QUERY_<function name>" and details
   summarizing the params used (not the full result, to keep AuditLog rows
   small).
5. Add redaction: none of the ai-tools functions should ever select
   AdminUser.passwordHash, Card.publicToken (return only cardCode), or full
   phone/email unless the specific tool's purpose requires it (getClientSummary
   legitimately needs contact info for a human operator using the assistant;
   note this explicitly rather than blanket-redacting everything).
6. Wire these tools into whatever chat/agent interface the team is building
   (out of scope for this prompt if that's a separate service — this prompt's
   deliverable is the read-only role + the tool functions + audit logging, ready
   to be called from any agent runtime).
7. Add an integration test that attempts an INSERT/UPDATE/DELETE using the
   ai-prisma client against a test database with the same restricted role
   applied, and asserts it throws a permissions error — this is the test that
   actually proves the safety property, not just a unit test of the tool
   functions' happy path.
```

### PROMPT 19 — Weekly insight digest + anomaly detection

```
Context: Depends on Prompt 18 (read-only tool layer) and ideally Prompt 13
(profitability data) existing first, since a digest without profitability data
is much less useful.

Task:
1. Create a scheduled Netlify function (follow the existing "keep-alive"
   scheduled function pattern in netlify.toml) that runs weekly, calling the
   ai-tools functions from Prompt 18 to assemble: least-profitable activities
   this week (via getActivityProfitability), clients who moved to "Inactive"
   segment in the last 7 days (query Client where customerSegment = "Inactive"
   and updatedAt in range), and invoices newly past 30 days unpaid (via
   getOverdueInvoices).
2. Pass this data to an LLM call (use the Anthropic API directly, following the
   pattern in the anthropic_api_in_artifacts conventions if reused elsewhere in
   this org, otherwise a plain server-side fetch to api.anthropic.com/v1/messages)
   with a system prompt instructing it to summarize findings in plain language
   and flag anything that looks like an anomaly (e.g. "this ledger entry has no
   matching invoice or redemption" — check AuditLog vs LedgerEntry for entries
   created via the UPDATE_LEDGER_ENTRY action from Prompt 2, which are exactly
   the ones worth flagging since they bypass the normal invoice/redemption flow).
3. Deliver the digest via the real email integration from Prompt 7 to a
   configurable list of admin emails (new env var DIGEST_RECIPIENT_EMAILS).
4. Log the full digest content and the anomalies flagged to a new table
   WeeklyDigest (id, sentAt, summaryText, anomaliesJson) so past digests are
   browsable in the admin UI, not just emailed and forgotten.
5. Add a simple "Insights" page under src/app/admin/(dashboard)/ listing past
   digests.
6. This prompt should not give the AI any write capability — it only reads via
   Prompt 18's tools and its only "write" is inserting rows into WeeklyDigest
   through the regular (non-AI) prisma client, done by your own server code, not
   by the model.
```

### PROMPT 20 — Human-approved write queue for the AI assistant

```
Context: Depends on Prompt 18. This is the ONLY path by which the AI assistant
should ever be able to cause a database write, and only once the business
explicitly decides to enable it — do not wire this up to auto-execute anything.

Task:
1. Add a ProposedAction model: id, proposedBy ("ai"), actionType (e.g.
   "MARK_INVOICE_PAID", "ARCHIVE_CLIENT"), targetId, payloadJson, reasoning
   (the model's explanation for why), status ("pending" | "approved" |
   "rejected"), reviewedBy (AdminUser id), reviewedAt, createdAt.
2. Create src/modules/proposed-actions/ (repository/service/validators) following
   the standard pattern. createProposal(actionType, targetId, payload, reasoning)
   just inserts a pending row — no execution logic here at all.
3. Add executeApprovedAction(proposalId, adminId): a lookup table mapping
   actionType -> the existing service method it should call (e.g.
   "MARK_INVOICE_PAID" -> billingService.updateInvoiceWithCredits(targetId,
   { status: "paid" }, adminId)), executed ONLY when an admin explicitly clicks
   approve. Reuse the existing service methods (with their existing audit
   logging from Prompts 2/3) rather than writing new mutation logic — this
   queue is a gate in front of code that already exists and is already audited.
4. Add admin UI under src/app/admin/(dashboard)/ai-proposals/ listing pending
   proposals with the model's reasoning, and Approve/Reject buttons
   (requireSuperAdminSession for approval, since this is executing arbitrary
   mutations).
5. Keep the set of supported actionTypes small and explicit (a hardcoded switch,
   not a generic "run this function by name" mechanism) so the blast radius of
   what the AI can ever propose is bounded and reviewable in the codebase itself.
6. Do not connect any AI process to createProposal automatically as part of this
   prompt — ship the queue and the manual "someone pastes in a proposal via API"
   path first, verify the approve/execute flow works and is audited correctly,
   then connect an actual model call in a follow-up once the team is comfortable.
```

---

## PHASE 5 — Additional Features

### PROMPT 21 — Client self-service login/portal

```
Context: Clients currently only ever interact via a semi-public token URL
(src/app/eventscard/[token]/page.tsx) — there's no authenticated client account.
Once Organization employees are onboarded (Prompt 8/9), they'll likely expect a
real login rather than a bookmarked link on a shared/company device.

Task:
1. Add `passwordHash String?` and `emailVerifiedAt DateTime?` to the Client
   model via migration (nullable — most clients still won't set a password and
   will keep using the token-link flow; this is additive, not a replacement).
2. Add a new NextAuth provider (separate from the existing AdminUser
   CredentialsProvider in src/lib/auth-options.ts — do not merge client and admin
   auth into one provider/session shape) or a lightweight custom session
   mechanism scoped to /client/* routes, following the same JWT session strategy
   already used for admin.
3. Add POST /api/public/client-auth/set-password (token-gated: requires the
   card's publicToken as proof of ownership, same trust model as the existing
   eventscard page) letting a client set a password the first time, then
   /api/public/client-auth/login for subsequent logins by email+password.
4. Add a new route group src/app/client/(dashboard)/ mirroring the structure of
   src/app/admin/(dashboard)/ (own layout.tsx, middleware protection) with pages
   for: balance/history (reuse the data already shown on the eventscard page),
   profile edit, invoice history.
5. Update src/middleware.ts to add client-session protection for /client/*
   paths, following the exact pattern already used for /admin/* (including the
   NEXTAUTH_SECRET fail-loud check).
6. Keep the existing token-URL flow (src/app/eventscard/[token]/page.tsx) fully
   working and unchanged for clients who never set a password — this is a
   strictly additive feature.
```

### PROMPT 22 — Session waitlists

```
Context: ActivitySession already has a `capacity` field but nothing happens
when it's reached — no waitlist exists.

Task:
1. Add a SessionWaitlist model: id, sessionId, clientId, position (Int),
   createdAt, notifiedAt (DateTime?), status ("waiting" | "offered" | "expired" |
   "converted"). Migration.
2. In BillingService.createRedemption (src/modules/invoices/service.ts), before
   creating a redemption tied to a sessionId, check
   prisma.redemption.count({ where: { sessionId } }) against
   session.capacity — if at capacity, instead of throwing, offer to add the
   client to SessionWaitlist at the next position (return a distinct result
   shape/error code "SESSION_FULL_WAITLISTED" so the calling UI can show the
   right message, matching the existing error-code style like
   "ACTIVITY_NOT_FOUND"/"NO_AVAILABLE_EVENTS" already used in this file).
3. When a redemption is deleted/refunded for a full session (deleteRedemption /
   bulkRefundSession, same file), check the waitlist for that session and if
   someone is waiting, mark the top entry "offered" and send a notification
   (via src/lib/notifications.ts) giving them a time-boxed window to redeem.
4. Add a small admin UI section on the session detail view showing the current
   waitlist and allowing manual promotion.
5. Tests: waitlist position assignment, promotion on cancellation, and that a
   session below capacity never touches the waitlist at all.
```

### PROMPT 23 — Automated invoice PDFs emailed to clients/organizations

```
Context: Depends on Prompt 14 (PDF generation via jsPDF) and Prompt 7 (real
email delivery). Right now invoices are never automatically emailed anywhere.

Task:
1. Reuse src/lib/invoice-pdf.ts from Prompt 14. Add a
   sendInvoiceEmail(invoiceId) helper in src/lib/email.ts (or a new
   src/lib/invoice-delivery.ts) that renders the PDF and calls sendEmail() with
   it as an attachment (check Resend's Node SDK attachment API for the correct
   payload shape).
2. Hook this into BillingService.createInvoiceWithCredits and
   updateInvoiceWithCredits (src/modules/invoices/service.ts) as a
   postCommitAction — following the existing postCommitActions array pattern
   already used throughout this file and src/modules/subscribers.ts — fired
   whenever an invoice transitions to "paid" or is newly created with a client
   email on file. Respect Client.marketingOptIn is NOT required here since this
   is transactional (their own invoice), not promotional.
3. For Organization statements (Prompt 10), send to
   Organization.billingContactEmail instead.
4. Add a per-invoice "Resend invoice email" button in
   src/app/admin/(dashboard)/invoices/page.tsx for manual re-sends.
5. Tests: mock the email client and assert it's called with the right recipient
   and a non-empty PDF buffer on invoice creation and on paid-status transition,
   and NOT called again on unrelated updates (e.g. editing just the notes field).
```

---

## Notes on running these with Antigravity

- Paste one prompt block at a time as its own task — don't batch multiple
  schema-changing prompts (8, 9, 10, 11, 12) into one session, since Prisma
  migrations need to be generated and reviewed sequentially against the current
  `prisma/schema.prisma` state.
- After any prompt that adds a migration, tell it explicitly to run
  `node prisma/prepare.js && npx prisma generate` (matches the existing
  `postinstall`/`db:generate` scripts in package.json) before writing any code
  that imports the new Prisma types, or it'll be coding against stale generated
  types.
- Ask it to run `npm run test` and `npm run lint` at the end of every prompt —
  both are already configured (vitest, eslint with `ignoreDuringBuilds: true` in
  next.config.ts, so lint failures won't block a build but should still be
  fixed).
- For anything touching money (Prompts 1-4, 8-14, 16), ask for a short written
  summary of what changed before accepting the diff — these are the areas where
  a subtly wrong implementation costs real revenue or trust, worth the extra
  five minutes of review each time.
