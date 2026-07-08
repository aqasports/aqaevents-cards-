# Club Check-In System — Root Cause Diagnosis & Fix Prompt

**This supersedes the earlier "build it from scratch" prompt.** I opened the actual repo (`aqaevents-cards--main`) and the feature is already mostly built — Prisma models, admin Clubs CRUD, the Activities toggle, the public terminal page, the QR scanner, all exist. It's not a missing feature, it's a **broken one**, and I found the specific bugs. Hand this whole document to your coding CLI as-is; it names exact files, exact lines, and exact replacement code — no more guessing.

---

## 0. How I found these (so the agent doesn't re-litigate it)

I read: `prisma/schema.prisma`, `prisma/prepare.js`, `prisma/safe-migrate.js`, both club-related migrations, `src/app/api/public/checkin/[clubToken]/route.ts`, `src/app/checkin/[clubToken]/page.tsx`, `src/app/api/admin/clubs/**`, `src/modules/activities/validators.ts`, `src/lib/api-auth.ts`, `src/middleware.ts`, `netlify.toml`, and the activities admin pages. The bugs below are confirmed by reading the code directly, not inferred from the README.

---

## 1. 🔴 CRITICAL — `CheckInStatus` is a Prisma `enum`, and that cannot work on this project's SQLite dev database

**This is almost certainly why nothing works locally.**

`prisma/schema.prisma` declares:
```prisma
enum CheckInStatus {
  SUCCESS
  DUPLICATE
  NOT_REDEEMED
  INVALID_CARD
}

model CheckIn {
  ...
  status CheckInStatus @default(SUCCESS)
  ...
}
```

**The SQLite connector does not support native enums at all** — Prisma's schema validator rejects an `enum` block outright when the active `datasource` provider is `sqlite`. `prisma generate`, `prisma db push`, and `prisma validate` will all fail before any table is touched.

Your repo already knows this: every other status-like field in this exact schema is a plain `String`, on purpose — `Card.status`, `Invoice.status`, `AdminUser.role`, `CardDemand.status`, `ActivityProposal.status`. `CheckInStatus` is the *only* real enum anywhere in the file. It breaks the one convention the rest of the codebase was carefully following.

It gets worse: `prisma/prepare.js` rewrites the `provider` field in `schema.prisma` at build time — `sqlite` for local dev (`DATABASE_URL=file:./dev.db`, per `.env.example`), `postgresql` in production (any non-`file:` URL). The enum happens to be *valid* on Postgres, so if this was ever exercised through a deployed build, it could look like it "worked" there — while being completely broken for anyone running `npm run dev` locally, which is exactly the README's own quick-start flow. That mismatch is the "why does it work for me on Netlify but not on my machine" trap.

### Fix
Change the schema to match this project's existing convention — a plain `String`, not a Prisma enum:

```prisma
model CheckIn {
  id           String        @id @default(cuid())
  clientId     String
  client       Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  activityId   String
  activity     Activity      @relation(fields: [activityId], references: [id], onDelete: Cascade)
  sessionId    String?
  session      ActivitySession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
  clubId       String
  club         Club          @relation(fields: [clubId], references: [id], onDelete: Cascade)
  redemptionId String?
  redemption   Redemption?   @relation(fields: [redemptionId], references: [id], onDelete: SetNull)
  status       String        @default("SUCCESS") // SUCCESS | DUPLICATE | NOT_REDEEMED | INVALID_CARD — plain String on purpose, matching Card.status/Invoice.status/etc. The SQLite connector used for local dev does not support native Prisma enums.
  scannedAt    DateTime      @default(now())
  scannedIp    String?

  @@index([clubId, scannedAt])
  @@index([clientId, activityId])
}
```

Delete the `enum CheckInStatus { ... }` block entirely.

Add one small shared constant so the four valid values live in exactly one place (`src/lib/check-in-status.ts`):
```ts
export const CHECK_IN_STATUSES = ["SUCCESS", "DUPLICATE", "NOT_REDEEMED", "INVALID_CARD"] as const;
export type CheckInStatusValue = (typeof CHECK_IN_STATUSES)[number];
```
(No API currently accepts a status value from outside — the server always sets it internally — so no Zod validation is required for it, just the type/constant for reuse in TS code.)

### Migration cleanup
`prisma/safe-migrate.js` runs `prisma db push --accept-data-loss` for SQLite (ignores the migrations folder — this is why local dev isn't blocked by migration-file dialect, only by schema *validation*, which is the enum problem above) but runs `prisma migrate deploy` against the committed migration files for Postgres in production.

The two existing club-related migrations (`prisma/migrations/20260708210600_add_club_checkin/` and `20260708221000_refactor_club_checkin/`) both hard-code the enum (`CREATE TYPE "CheckInStatus" AS ENUM (...)`). Once the schema no longer declares that enum, these migrations no longer match `schema.prisma`, which will cause Prisma to report drift the next time anyone runs `migrate dev`/`migrate deploy` against Postgres.

- **If this feature has never been deployed to a real production database yet:** delete both of those migration folders and, after the schema fix, generate one clean migration against a Postgres-shaped schema (temporarily set `provider = "postgresql"`, run `npx prisma migrate dev --name add_club_checkin_system`, then let `prepare.js` handle switching the provider back at build time as it already does).
- **If it has already been deployed and applied:** don't delete history — instead add a new migration that `ALTER TABLE "CheckIn" ALTER COLUMN "status" TYPE TEXT`-equivalent and `DROP TYPE "CheckInStatus"`, so production catches up to the corrected schema without data loss.

For your local sqlite dev database specifically: since the schema shape has changed across two in-progress migration attempts already (column renames like `contact`→`contactName`, `token`→`terminalToken`, `active`→`isActive`), the simplest reliable fix is to delete your local `prisma/dev.db`, then run `npm run db:push` and `npm run db:seed` fresh, rather than trying to reconcile a partially-migrated dev database by hand.

---

## 2. 🔴 CRITICAL — the terminal page reads fields the API never sends

This is why a scan can "succeed" on the server but look completely broken on screen: no client name, no timestamp, and the live roster never updates.

**`src/app/api/public/checkin/[clubToken]/route.ts`** (POST) returns, on success:
```json
{ "status": "SUCCESS", "client": { "name": "..." }, "activity": { "name": "..." }, "checkedInAt": "..." }
```
and on duplicate:
```json
{ "status": "DUPLICATE", "client": { "name": "..." }, "originalCheckedInAt": "..." }
```

But **`src/app/checkin/[clubToken]/page.tsx`**, inside `handleScanSuccess`, reads:
```ts
setScanResult({
  status,
  clientName: data.clientName,       // ← doesn't exist, actual field is data.client.name
  activityName: data.activityName,   // ← doesn't exist, actual field is data.activity.name
  timestamp: data.timestamp || new Date().toISOString(), // ← doesn't exist either
  errorMessage: data.message,
});

if (status === "SUCCESS" && data.clientName) {   // ← always false, data.clientName is always undefined
  setLiveRoster((prev) => [ /* never runs */ ]);
}
```

Every field it's trying to read is `undefined`, so:
- `ResultBanner` shows a colored status card with no name and no time — it *looks* broken even when the backend logic is completely correct.
- The `if (status === "SUCCESS" && data.clientName)` guard never fires, so a fresh successful scan never gets appended to the live roster — the agent has no way to see who just checked in beyond the momentary banner.

### Fix
In `src/app/checkin/[clubToken]/page.tsx`, replace the response-handling block inside `handleScanSuccess`:

```ts
      if (res.ok || res.status === 404 || res.status === 400 || res.status === 422) {
        const status = data.status as "SUCCESS" | "DUPLICATE" | "NOT_REDEEMED" | "INVALID_CARD";

        // Play beep sound
        if (status === "SUCCESS") {
          playAudioFeedback("success");
        } else {
          playAudioFeedback("error");
        }

        const resolvedClientName = data.client?.name as string | undefined;
        const resolvedActivityName = data.activity?.name as string | undefined;
        const resolvedTimestamp =
          status === "DUPLICATE" ? data.originalCheckedInAt : data.checkedInAt;

        setScanResult({
          status,
          clientName: resolvedClientName,
          activityName: resolvedActivityName,
          timestamp: resolvedTimestamp || new Date().toISOString(),
          errorMessage: data.message,
        });

        // Add to local roster immediately if successful
        if (status === "SUCCESS" && resolvedClientName) {
          setLiveRoster((prev) => [
            {
              clientName: resolvedClientName,
              checkedInAt: resolvedTimestamp || new Date().toISOString(),
              activityId: selectedActivityId,
              sessionId: selectedSessionId || null,
            },
            ...prev,
          ]);
        }
      } else {
```

That's the only change needed in this file — everything around it (scanner pause/resume, audio feedback, roster filtering) is already correct.

---

## 3. 🟠 HIGH — a legitimately redeemed client can still get `NOT_REDEEMED`

**`src/app/admin/(dashboard)/redeem/page.tsx`** makes `sessionId` optional when staff redeem an activity (`const sessionId = (formData.get("sessionId") as string) || undefined`) — so plenty of real `Redemption` rows will have `sessionId: null`.

But the terminal auto-selects "today's session" (or the first available one) and always sends a `sessionId` in the check-in POST, and **`src/app/api/public/checkin/[clubToken]/route.ts`** matches strictly:
```ts
const redemption = await prisma.redemption.findFirst({
  where: {
    clientId: card.client.id,
    activityId: activity.id,
    ...(sessionId ? { sessionId } : {}),
  },
  orderBy: { redeemedAt: "desc" },
});
```
If the client's redemption has `sessionId: null` but the terminal is filtering for a specific session, this query finds nothing — a client who genuinely redeemed the activity gets rejected as `NOT_REDEEMED`.

### Fix
Relax the match to accept a redemption tagged with this exact session, **or** one redeemed without any session at all:

```ts
const redemption = await prisma.redemption.findFirst({
  where: {
    clientId: card.client.id,
    activityId: activity.id,
    // Accept a redemption tagged with this exact session, OR one redeemed
    // without a session (sessionId is optional in /admin/redeem) — otherwise
    // legitimately redeemed clients get rejected just because staff didn't
    // pick a session at redemption time.
    ...(sessionId ? { OR: [{ sessionId }, { sessionId: null }] } : {}),
  },
  orderBy: { redeemedAt: "desc" },
});
```

---

## 4. 🟡 MEDIUM — Clubs are invisible to anyone who isn't `super_admin`

**`src/app/api/admin/clubs/route.ts`** (`GET`) and **`src/app/api/admin/clubs/[id]/route.ts`** (`GET`) both call `requireSuperAdminSession()`. Every comparable *read* endpoint in this codebase (`/api/admin/activities`, `/api/admin/packages`) uses `requireAdminSession()` for `GET` and reserves `requireSuperAdminSession()` for `POST`/`PATCH`/`DELETE`.

Because of this inconsistency, any admin logged in with the `staff` role (the seed script creates one: `staff@...` / role `staff`) gets a silent 403 on every club lookup — the club dropdown in the Activities form is empty, and `/admin/clubs` itself shows a "Forbidden" message instead of the list. If whoever is testing this is using the `staff` seed account rather than the `super_admin` one, this alone would make the feature look totally non-functional.

### Fix
In `src/app/api/admin/clubs/route.ts`, change the `GET` handler's auth check from:
```ts
export async function GET() {
  const { error } = await requireSuperAdminSession();
```
to:
```ts
export async function GET() {
  const { error } = await requireAdminSession();
```
(keep `POST` on `requireSuperAdminSession`, unchanged)

In `src/app/api/admin/clubs/[id]/route.ts`, make the same change only in the `GET` handler (leave `PATCH`/`DELETE` on `requireSuperAdminSession`).

Also consider switching `src/app/api/admin/clubs/[id]/checkins/route.ts`'s `GET` to `requireAdminSession` for the same reason — it only returns names and timestamps, nothing sensitive enough to warrant super-admin-only visibility, and staff running the redeem desk will want to check attendance too. Leave `regenerate-token` on `requireSuperAdminSession` — rotating a live terminal URL is exactly the kind of action that should stay locked down.

---

## 5. 🟢 LOW — no server-side enforcement that `clubId` is required when `requiresCheck` is true

`src/modules/activities/validators.ts` accepts `requiresCheck` and `clubId` independently with no cross-field rule — the UI enforces "clubId required if requiresCheck" client-side only, so a direct API call (or a future UI bug) could create an activity flagged `requiresCheck: true` with no club attached, which the public terminal's `GET` handler would then silently exclude from the club's activity list (since it filters on `clubId: club.id`), making it look like the activity vanished for no visible reason.

### Fix
Add the cross-field check at the point where the merged (existing + patch) state is known — for `createActivitySchema` a simple `.refine` on the full object works:
```ts
export const createActivitySchema = z.object({
  // ...existing fields...
}).refine(
  (data) => !data.requiresCheck || !!data.clubId,
  { message: "clubId is required when requiresCheck is true", path: ["clubId"] }
);
```
For `updateActivitySchema`, **don't** do the same naive `.refine` on the raw patch — most PATCH calls won't include `requiresCheck` or `clubId` at all (e.g. just toggling `active`), and a raw refine would need to know the activity's *existing* `clubId` to judge a patch that sets `requiresCheck: true` without repeating `clubId`. Put this check in `ActivitiesService.updateActivity` instead: fetch the current activity, merge with the incoming patch, and reject if the merged result has `requiresCheck: true` with no `clubId`.

---

## 6. 🟢 LOW — dead field: `ActivitySession.clubId`

`ActivitySession.clubId` exists in the schema and is set up in the Prisma relations, but nothing in the actual check-in logic reads it — `GET /api/public/checkin/[clubToken]` filters activities by `Activity.clubId` only. It's leftover from the first migration attempt (`add_club_checkin`), before the design was refactored to put the club on the `Activity` instead of the `ActivitySession`. It's harmless as-is, but either wire it up for genuine per-session club overrides or remove it — leaving it in place with no read/write path is just a trap for the next person who assumes it does something.

---

## 7. Ordered fix checklist for the CLI

1. Edit `prisma/schema.prisma`: delete the `enum CheckInStatus` block, change `CheckIn.status` to `String @default("SUCCESS")`.
2. Add `src/lib/check-in-status.ts` with the `CHECK_IN_STATUSES` constant.
3. Delete your local `prisma/dev.db`, run `npm run db:push`, then `npm run db:seed`.
4. Decide on migration history per §1 ("never deployed" vs "already deployed" path) and act accordingly.
5. Fix `handleScanSuccess` in `src/app/checkin/[clubToken]/page.tsx` per §2.
6. Fix the redemption match query in `src/app/api/public/checkin/[clubToken]/route.ts` per §3.
7. Change `GET` auth in `src/app/api/admin/clubs/route.ts` and `src/app/api/admin/clubs/[id]/route.ts` (and optionally `.../checkins/route.ts`) per §4.
8. Add the create-time `.refine` to `createActivitySchema` and the merged-state check to `ActivitiesService.updateActivity` per §5.
9. Decide whether to wire up or remove `ActivitySession.clubId` per §6.

## 8. Verification — do this after the fixes, not before

- `npm run dev` starts cleanly with the default `.env.example` (sqlite) config — no Prisma validation error on boot.
- Log in as the seeded `staff` user (not `super_admin`) and confirm the club dropdown in the Activities edit form is populated.
- Create a club, flip an activity's "Requires Club Check-In" on, attach the club.
- Redeem that activity for a test client **without** picking a session — then scan that client's card at the club's terminal URL with a session pre-selected. Confirm it returns `SUCCESS`, not `NOT_REDEEMED`.
- Confirm the terminal's result card actually shows the client's name and a timestamp, and that the live roster below it grows immediately after a successful scan (not just on page reload).
- Scan the same card again — confirm it shows `DUPLICATE` with the *original* check-in time, not the current time.
- Scan a card that never redeemed the activity — confirm `NOT_REDEEMED`.
- Deactivate the club — confirm the terminal URL immediately stops working.
