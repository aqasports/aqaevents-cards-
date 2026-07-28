# AQA Sports — API Contract

**Version:** 1  
**Last audited:** 2026-07-28  
**Version header:** Every response carries `X-API-Contract-Version: 1`.  
Bump this value in `src/middleware.ts` (`API_CONTRACT_VERSION`) when a breaking change is introduced to any existing endpoint's request or response shape.

---

## Client Registry

| Client | Type | Auth mechanism | Notes |
|---|---|---|---|
| **next-admin** | Next.js web app | NextAuth session cookie | Calls every admin + public route via browser `fetch()` |
| **flutter-app** | Flutter mobile app | NextAuth session cookie (set via `/api/auth/callback/credentials`) | Explicit endpoint list in `flutter-app/lib/core/api/endpoints.dart` |
| **electron-admin** | Electron desktop shell | Injects `X-Admin-App-Token` header via `webRequest.onBeforeSendHeaders` | Chromium shell over `https://aqasports.com/admin` — no independent `fetch()` calls; inherits all admin routes from next-admin |
| **admin-app** | Capacitor (WebView) shell | Injects `X-Admin-App-Token` header via `capacitor.config.js` | WebView over `https://aqasports.com/admin` — same as electron-admin, not an independent API client |

> **Note on electron-admin and admin-app:** Both are thin shell wrappers that load the Next.js web admin in an embedded browser. They do not make independent `fetch()` calls to the API. Their only unique behaviour is injecting the `X-Admin-App-Token` header (enforced by middleware when `ENFORCE_ADMIN_APP=true`). Every API route they hit is the same route the next-admin web app hits.

---

## Auth Levels

| Level | Meaning |
|---|---|
| `none` | No authentication required — public endpoint |
| `admin` | Any authenticated AdminUser session (staff or super_admin) |
| `super_admin` | Must have `role = "super_admin"` |
| `client_session` | Client magic-link session (separate from AdminUser) |
| `club_terminal` | Club terminal token (`X-Terminal-Token` header) |

---

## Health & Infrastructure

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/health` | GET | none | — | `{ status, database, cleanedRateLimitBuckets }` | next-admin (uptime ping), Netlify health checks |

---

## Auth Routes (NextAuth)

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | none | NextAuth protocol | NextAuth protocol | next-admin, flutter-app, electron-admin, admin-app |

---

## Admin Routes

All admin routes are protected by the middleware which redirects unauthenticated requests to `/admin/login`. Routes additionally call `requireAdminSession()` or `requireSuperAdminSession()` inside the handler for fine-grained role enforcement.

### Activities

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/activities` | GET | admin | `?includeInactive=true` optional | `Activity[]` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/activities` | POST | admin | `{ name, description?, creditCost?, imageUrl?, places?, duration?, active?, eventType?, requiresCheck?, clubId? }` | Created `Activity` | next-admin, electron-admin, admin-app |
| `/api/admin/activities/[id]` | GET | admin | — | `Activity` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/activities/[id]` | PATCH | admin | Partial `Activity` fields | Updated `Activity` | next-admin, electron-admin, admin-app |
| `/api/admin/activities/[id]` | DELETE | admin | — | `{ success: true }` | next-admin, electron-admin, admin-app |

### AI

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/ai/query` | POST | admin | `{ toolName: string, args?: object }` | Tool result JSON | next-admin |
| `/api/admin/ai/queue` | GET | admin | — | `AiActionQueue[]` pending items | next-admin |
| `/api/admin/ai/queue` | POST | admin | `{ actionType, proposedPayload, reasoning }` | Created queue item | next-admin |
| `/api/admin/ai/queue/[id]/approve` | POST | super_admin | — | `{ success: true }` | next-admin |
| `/api/admin/ai/queue/[id]/reject` | POST | super_admin | — | `{ success: true }` | next-admin |

### Audit Logs

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/audit-logs` | GET | super_admin | — | `AuditLog[]` with user relation | next-admin |

### Backup

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/backup` | GET | super_admin | — | JSON file download (all clients, cards, ledger, redemptions, invoices) | next-admin |

### Campaigns

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/campaigns` | GET | admin | — | `CampaignPromo[]` | next-admin |
| `/api/admin/campaigns` | POST | super_admin | `{ code, discountType, discountValue, maxUses?, validFrom?, validUntil? }` | Created `CampaignPromo` | next-admin |

### Cards

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/cards/export` | GET | admin | — | CSV file download of all cards | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/cards/lookup` | GET | admin | `?cardCode=AQA-XXXXXX` | `{ card, client }` or 404 | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/cards/prebatch` | POST | super_admin | `{ count: number }` | `{ created: number, cards: Card[] }` | next-admin |

### Check-in (Admin)

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/checkin` | POST | admin | `{ cardCode, activityId, sessionId? }` | `{ success, client, activity }` | next-admin, electron-admin, admin-app |

### Clients

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/clients` | GET | admin | `?search=&archived=&segment=&orgId=` | `Client[]` with org | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clients` | POST | admin | `{ fullName, email?, phone?, notes?, organizationId?, orgRole?, leadSource? }` | Created `Client` with card | next-admin, electron-admin, admin-app |
| `/api/admin/clients/[id]` | GET | admin | — | `Client` with cards, ledger, redemptions, invoices | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clients/[id]` | PATCH | admin | Partial `Client` fields | Updated `Client` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clients/[id]` | DELETE | super_admin | — | `{ success: true }` (archives client) | next-admin |
| `/api/admin/clients/[id]/credits` | POST | admin | `{ delta, type, reason?, packageId? }` | Updated ledger entry | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clients/[id]/not-paid` | POST | admin | `{ invoiceId }` | `{ success: true }` | next-admin |
| `/api/admin/clients/[id]/notifications` | POST | admin | `{ type, message, subject? }` | `{ success: true }` | next-admin |
| `/api/admin/clients/[id]/reissue-card` | POST | admin | — | New `Card` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clients/[id]/unarchive` | POST | super_admin | — | `{ success: true }` | next-admin |

### Clubs

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/clubs` | GET | admin | — | `Club[]` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clubs` | POST | super_admin | `{ name, logoUrl?, contactName?, contactEmail?, contactPhone? }` | Created `Club` | next-admin |
| `/api/admin/clubs/new-checkins-count` | GET | admin | — | `{ count: number }` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clubs/[id]` | GET | admin | — | `Club` with recent check-ins | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/clubs/[id]` | PATCH | super_admin | Partial `Club` fields | Updated `Club` | next-admin |
| `/api/admin/clubs/[id]` | DELETE | super_admin | — | `{ success: true }` | next-admin |
| `/api/admin/clubs/[id]/checkins` | GET | admin | `?limit=` | `CheckIn[]` with client & activity | next-admin |
| `/api/admin/clubs/[id]/regenerate-token` | POST | super_admin | — | `{ terminalToken: string }` | next-admin |

### Coaches

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/coaches` | GET | admin | — | `Coach[]` | next-admin |
| `/api/admin/coaches` | POST | admin | `{ name, email?, phone?, specialties?, defaultPayRate?, commissionRate? }` | Created `Coach` | next-admin |
| `/api/admin/coaches/[id]` | GET | admin | — | `Coach` | next-admin |
| `/api/admin/coaches/[id]` | PATCH | admin | Partial `Coach` fields | Updated `Coach` | next-admin |
| `/api/admin/coaches/[id]` | DELETE | admin | — | `{ success: true }` | next-admin |

### Demands (Card Demand Queue)

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/demands` | GET | admin | `?status=pending\|accepted\|rejected` | `CardDemand[]` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/demands/pending-count` | GET | admin | — | `{ count: number }` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/demands/[id]` | GET | admin | — | `CardDemand` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/demands/[id]` | PATCH | admin | `{ status, cardCode? }` | Updated `CardDemand` | next-admin, flutter-app, electron-admin, admin-app |

### Equipment

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/equipment` | GET | admin | — | `EquipmentAsset[]` with usage stats | next-admin |
| `/api/admin/equipment` | POST | admin | `{ name, category, purchasePrice?, purchaseDate?, usefulLifeMonths?, maintenanceCost? }` | Created `EquipmentAsset` | next-admin |
| `/api/admin/equipment/[id]` | GET | admin | — | `EquipmentAsset` | next-admin |
| `/api/admin/equipment/[id]` | PATCH | admin | Partial `EquipmentAsset` fields | Updated `EquipmentAsset` | next-admin |
| `/api/admin/equipment/[id]` | DELETE | admin | — | `{ success: true }` | next-admin |

### Expenses

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/expenses` | GET | admin | `?activityId=` | `ActivityExpense[]` | next-admin |
| `/api/admin/expenses` | POST | admin | `{ activityId, name, amount, notes? }` | Created `ActivityExpense` | next-admin |
| `/api/admin/expenses/[id]` | PATCH | admin | Partial `ActivityExpense` fields | Updated `ActivityExpense` | next-admin |
| `/api/admin/expenses/[id]` | DELETE | admin | — | `{ success: true }` | next-admin |

### Invoices

> **Financial data — see AGENTS.md rules before modifying.**

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/invoices` | GET | admin | `?clientId=&status=&from=&to=` | `Invoice[]` with client | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/invoices` | POST | admin | `{ clientId, amount, items, notes?, category?, organizationId? }` | Created `Invoice` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/invoices/export` | GET | admin | `?from=&to=` | CSV file download | next-admin |
| `/api/admin/invoices/pending-count` | GET | admin | — | `{ count: number }` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/invoices/[id]` | GET | admin | — | `Invoice` with client | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/invoices/[id]` | PATCH | admin | `{ status?, notes? }` | Updated `Invoice` | next-admin |
| `/api/admin/invoices/[id]` | DELETE | super_admin | — | `{ success: true }` | next-admin |
| `/api/admin/invoices/[id]/email` | POST | admin | — | `{ success: true }` (sends PDF by email) | next-admin |
| `/api/admin/invoices/[id]/pdf` | GET | admin | — | PDF file download | next-admin, flutter-app, electron-admin, admin-app |

### Ledger

> **Financial data — see AGENTS.md rules before modifying.**

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/ledger/[id]` | DELETE | super_admin | — | `{ success: true }` (voids a ledger entry) | next-admin |

### Organizations

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/organizations/[id]/invoices` | GET | admin | — | `Invoice[]` for org | next-admin |
| `/api/admin/organizations/[id]/invoices` | POST | admin | `{ amount, items, notes?, category? }` | Created org `Invoice` | next-admin |
| `/api/admin/organizations/[id]/provision` | POST | super_admin | `{ credits, reason? }` | `{ success: true }` (bulk credit grant) | next-admin |

### Packages

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/packages` | GET | admin | `?includeInactive=true` | `Package[]` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/packages` | POST | admin | `{ name, creditAmount, bonusCredits?, price, active? }` | Created `Package` | next-admin, electron-admin, admin-app |
| `/api/admin/packages/[id]` | GET | admin | — | `Package` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/packages/[id]` | PATCH | admin | Partial `Package` fields | Updated `Package` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/packages/[id]` | DELETE | super_admin | — | `{ success: true }` | next-admin |

### Products

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/products` | GET | admin | — | `Product[]` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/products` | POST | admin | `{ name, price, description?, imageUrl?, advertised?, active?, sortOrder? }` | Created `Product` | next-admin |
| `/api/admin/products/[id]` | PATCH | admin | Partial `Product` fields | Updated `Product` | next-admin |
| `/api/admin/products/[id]` | DELETE | admin | — | `{ success: true }` | next-admin |

### Proposals (Activity Proposals)

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/proposals` | GET | admin | `?status=pending\|reviewed\|archived` | `ActivityProposal[]` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/proposals/pending-count` | GET | admin | — | `{ count: number }` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/proposals/[id]` | PATCH | admin | `{ status }` | Updated `ActivityProposal` | next-admin, flutter-app, electron-admin, admin-app |

### Redemptions

> **Financial data — see AGENTS.md rules before modifying.**

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/redemptions` | GET | admin | `?clientId=&activityId=&from=&to=` | `Redemption[]` with client & activity | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/redemptions` | POST | admin | `{ clientId, activityId, sessionId?, creditsUsed?, notes? }` | Created `Redemption` + ledger debit | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/redemptions/[id]` | DELETE | super_admin | — | `{ success: true }` (refunds credits) | next-admin |

### Reports

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/reports/summary` | GET | admin | — | `{ clients, revenue, redemptions, topActivities }` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/reports/analytics` | GET | admin | `?from=&to=` | Time-series analytics data | next-admin |
| `/api/admin/reports/anomalies` | GET | admin | — | `{ anomalies: AnomalyResult[] }` | next-admin |
| `/api/admin/reports/ar-aging` | GET | admin | — | Accounts-receivable aging buckets | next-admin |
| `/api/admin/reports/funnel` | GET | admin | `?from=&to=` | Demand-to-client conversion funnel | next-admin |
| `/api/admin/reports/profitability` | GET | admin | `?from=&to=` | Per-activity profitability data | next-admin |

### Sessions (Activity Sessions)

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/sessions` | GET | admin | `?activityId=&from=&to=&clubId=` | `ActivitySession[]` with activity | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/sessions` | POST | admin | `{ activityId, sessionDate, location?, capacity?, clubId?, coachId?, coachPayOverride?, maxCapacity? }` | Created `ActivitySession` | next-admin, electron-admin, admin-app |
| `/api/admin/sessions/[id]` | GET | admin | — | `ActivitySession` with activity, club, redemptions, expenses | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/sessions/[id]` | PATCH | admin | Partial `ActivitySession` fields | Updated `ActivitySession` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/sessions/[id]` | DELETE | super_admin | — | `{ success: true }` | next-admin |
| `/api/admin/sessions/[id]/checkins` | GET | admin | — | `CheckIn[]` for session | next-admin |
| `/api/admin/sessions/[id]/expenses` | GET | admin | — | `SessionExpense[]` | next-admin |
| `/api/admin/sessions/[id]/expenses` | POST | admin | `{ activityExpenseId, quantity?, amount }` | Created `SessionExpense` | next-admin |
| `/api/admin/sessions/[id]/expenses/[expenseId]` | PATCH | admin | `{ quantity?, amount? }` | Updated `SessionExpense` | next-admin |
| `/api/admin/sessions/[id]/expenses/[expenseId]` | DELETE | admin | — | `{ success: true }` | next-admin |
| `/api/admin/sessions/[id]/promote` | POST | admin | — | `{ promoted: number }` (promotes waitlist) | next-admin |
| `/api/admin/sessions/[id]/refund-all` | POST | super_admin | — | `{ refunded: number }` | next-admin |
| `/api/admin/sessions/[id]/waitlist` | GET | admin | — | `SessionWaitlist[]` | next-admin |

### Settings

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/settings/credit-rate` | GET | none* | — | `{ creditRate: number }` | next-admin |
| `/api/admin/settings/credit-rate` | PATCH | super_admin | `{ creditRate: number }` | `{ success: true, creditRate: number }` | next-admin |
| `/api/admin/settings/flags` | GET | admin | — | `{ flags: [{ key, description, value, default }] }` | next-admin |
| `/api/admin/settings/flags` | PATCH | super_admin | `{ key: string, value: boolean }` | `{ success: true, key, value }` | next-admin |

> *`GET /api/admin/settings/credit-rate` has no explicit session check in the handler. Access is limited by the middleware redirect for non-authenticated requests to `/admin/*` paths.

### Users

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/admin/users` | GET | admin | — | `AdminUser[]` (no passwordHash) | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/users` | POST | super_admin | `{ email, name, password, role? }` | Created `AdminUser` | next-admin |
| `/api/admin/users/me/change-password` | POST | admin | `{ currentPassword, newPassword }` | `{ success: true }` | next-admin, flutter-app, electron-admin, admin-app |
| `/api/admin/users/[id]` | PATCH | super_admin | `{ name?, email?, role? }` | Updated `AdminUser` | next-admin |
| `/api/admin/users/[id]` | DELETE | super_admin | — | `{ success: true }` | next-admin |

---

## Client Self-Service Routes (`/api/client`)

These routes serve the client-facing portal (`/client/*`), not the admin panel.

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/client/auth/magic-link` | POST | none | `{ cardToken: string }` | `{ success: true }` (sends PIN via SMS/email) | flutter-app |
| `/api/client/auth/verify` | POST | none | `{ cardToken, pin }` | `{ success: true }` + sets session cookie | flutter-app |
| `/api/client/me` | GET | client_session | — | `{ client, balance, recentLedger, activeCard }` | flutter-app |

---

## Public Routes (`/api/public`)

No authentication required. Rate limiting is applied per-IP via `RateLimitBucket`.

| Path | Method | Auth | Request | Response | Callers |
|---|---|---|---|---|---|
| `/api/public/activities` | GET | none | — | `Activity[]` (active only, public fields) | flutter-app |
| `/api/public/cards/[token]` | GET | none | — | `{ client, balance, card }` or 404 | flutter-app |
| `/api/public/cards/[token]/purchase` | POST | none | `{ type, packageId?, customAmount?, productId? }` | `{ confirmation_required: true, confirmationCode }` | flutter-app |
| `/api/public/cards/[token]/purchase/confirm` | POST | none | `{ confirmationCode }` | `{ success: true }` or 400 | flutter-app |
| `/api/public/checkin/[clubToken]` | POST | none | `{ cardCode, activityId, sessionId? }` (terminal token in header) | `{ success, client, activity }` | club terminal (browser) |
| `/api/public/demands` | POST | none | `{ name, phone, email?, creditType, packageId?, amount?, marketingConsent?, utmSource?, ... }` | `{ success: true }` | flutter-app, public website |
| `/api/public/packages` | GET | none | — | `Package[]` (active only) | flutter-app, public website |
| `/api/public/promo/validate` | POST | none | `{ code: string }` | `{ valid: true, discount }` or `{ valid: false }` | flutter-app |
| `/api/public/proposals` | POST | none | `{ title, description, userName, userPhone, userEmail?, marketingConsent? }` | `{ success: true }` | flutter-app, public website |
| `/api/public/sessions/[id]/waitlist` | POST | none | `{ cardToken: string }` | `{ success: true }` | flutter-app |
| `/api/public/signup` | POST | none | `{ name, phone, email?, packageId?, marketingConsent?, utmSource?, ... }` | `{ success: true }` | flutter-app, public website |

---

## Breaking-Change Protocol

When a breaking change is unavoidable:

1. Increment `API_CONTRACT_VERSION` in `src/middleware.ts`.
2. Update this document — add a migration note to the affected route row.
3. Notify each client team (flutter-app, electron-admin, admin-app) before deploying.
4. Clients should read `X-API-Contract-Version` and surface a "please update your app" banner when the value does not match their compiled expectation.

---

## How to Add a New Feature Flag

1. Add one entry to `FLAG_REGISTRY` in `src/lib/feature-flags.ts`:
   ```ts
   { key: "feature_my_flag", description: "...", default: false }
   ```
2. The flag will immediately appear in the admin UI under **Settings > Feature Flags**.
3. Read it in server code with `await getFlag("feature_my_flag")`.
4. No new route, no new UI section required.
