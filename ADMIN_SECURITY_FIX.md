# AQA Admin Panel — Critical Security Remediation

**Status:** OPEN — CRITICAL
**Found:** 2026-07-03
**Scope:** `aqasports.com/admin/*` and any API routes it depends on
**Impact:** Unauthenticated read access to live business data + likely unauthenticated write access to client/credit-issuing functions

---

## 0. TL;DR for whoever picks this up

`/admin`, `/admin/clients/new`, and `/admin/settings` all return **fully rendered pages with real production data** to a plain unauthenticated HTTP GET request — no session, no cookie, no token, no login redirect. This was verified with a non-JS-executing HTTP client, which means the server itself is sending authenticated content to anyone who asks, not just leaking via a client-side redirect flash.

The highest-risk consequence: `/admin/clients/new` is the client-creation + card-issuing + **credit-adding** form. If the API endpoint behind that form has the same gap (not yet confirmed — deliberately not tested against production), anyone who finds the URL can mint free credits, create fake clients, or void/redeem real ones.

**Do not** submit real requests against the production write endpoints to "confirm" this — assume it's vulnerable and fix it first, verify after, in staging.

---

## 1. Evidence

| Request | Method | Auth provided | Result |
|---|---|---|---|
| `https://aqasports.com/admin` | GET | none | 200 — full dashboard: revenue (day/month/year), client count, **67 outstanding credits**, **51 inactive cards**, full nav to Clients/Packages/Products/Invoices/Staff/Settings |
| `https://aqasports.com/admin/clients/new` | GET | none | 200 — full "create client / issue card / assign credit package" form, all fields rendered |
| `https://aqasports.com/admin/settings` | GET | none | 200 — account settings panel, password-change form, role field |

No request in this list received a 401, 403, or redirect to a login page.

---

## 2. Root cause hypothesis (confirm during fix)

Given the stack is **Astro (static/SSR) + Node.js/Netlify functions for the API**, the most likely causes, roughly in order of probability:

1. **No shared auth guard on `/admin/*` Astro routes.** Each admin page fetches its own data server-side (that's how real numbers like "67 credits" ended up in the HTML) without first checking for a valid session. Auth may only be enforced by a client-side script (e.g., checking `localStorage`/a cookie in a React island and redirecting) — which a browser user would see as "flash then redirect" but a non-browser client never triggers.
2. **No `middleware.ts` (or equivalent) enforcing session checks before page render.** Astro supports a global middleware file that runs before every route; if it doesn't exist, or exists but isn't checking `/admin/*`, every admin page is effectively public.
3. **The Netlify function(s) behind the admin API (client creation, credit assignment, redeem) may not independently verify the caller's session/role**, since the page itself never enforced one. APIs must never trust that "you can only reach me via the UI" — they need their own auth check regardless of how the request arrives.

---

## 3. Fix plan (work top to bottom, do not skip ahead)

### P0 — Contain first (do this before writing any code)
- [ ] Password-protect or IP-restrict the `/admin/*` path at the Netlify level (Netlify supports basic auth / access rules per path) until the code fix ships.
- [ ] Confirm with the team whether the exposure window requires notifying any affected clients (data exposed: names, emails, phone numbers, credit balances — check `/admin/clients` specifically for the full extent).

### P0 — Server-side auth middleware
- [ ] Add (or fix) `src/middleware.ts` in the Astro project. It must run **before** any page-level data fetching, and must check a real server-side session (signed cookie / JWT verified server-side — not just "cookie exists").
- [ ] Pattern:

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { verifySession } from "./lib/auth"; // must do real server-side verification

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/admin")) {
    const session = await verifySession(context.cookies.get("session")?.value);
    if (!session || session.role !== "staff") {
      return context.redirect("/admin/login");
    }
    context.locals.session = session; // pages can trust this from now on
  }
  return next();
});
```

- [ ] Every `/admin/*` page's server frontmatter should use `Astro.locals.session` (set by the middleware above) rather than re-implementing its own check — one source of truth, not one check per page.
- [ ] Confirm this covers **every** admin route, not just the ones tested here: `/admin`, `/admin/clients`, `/admin/clients/new`, `/admin/packages`, `/admin/invoices`, `/admin/staff`, `/admin/settings`, `/admin/redeem`, any `/admin/print/*` or export routes.

### P0 — Protect the API layer independently
- [ ] Find every Netlify function / API route that the admin UI calls (client create, card issue, credit/package assignment, redeem, staff management, settings update).
- [ ] Each one must independently verify the caller's session server-side (do not rely on the page-level guard above — assume the API can be called directly with curl/Postman, because it can).
- [ ] Return `401 Unauthorized` for missing/invalid session, `403 Forbidden` for valid session but wrong role.
- [ ] Specifically confirm the credit-adding / package-assignment endpoint and the redeem endpoint enforce this — these are the two with direct financial impact.

### P1 — Verify in staging, not production
- [ ] After the middleware + API checks are in place, re-test all three URLs from Section 1 in a staging environment with an unauthenticated client (curl, or this same "fetch with no cookies" approach). Expect 401/403/redirect on all of them.
- [ ] Only after that passes, test the credit-adding flow specifically: confirm an unauthenticated POST to the client-create/credit-assign endpoint is rejected.

### P1 — Rate limiting + logging
- [ ] Add rate limiting on `/admin/*` and its API routes (per-IP), so brute-force or scripted probing is slowed and visible.
- [ ] Log auth failures on admin routes (IP, timestamp, path) so future probing attempts are detectable.

### P2 — Related hardening (lower urgency, do after the above ships)
- [ ] Check the public `/eventscard` balance-lookup flow for IDOR: are card codes sequential or otherwise guessable? Can one card code be used to enumerate or infer another client's balance/details? Test in staging with a range of synthetic card codes, not production.
- [ ] Password policy on `/admin/settings` currently allows a 6-character minimum — raise to at least 12 characters, and consider adding MFA for staff accounts given this panel controls real money-equivalent credits.
- [ ] Rotate any API keys / secrets that these routes reference, since exposure duration is unknown.
- [ ] Add CSRF protection on all state-changing admin forms if not already present (relevant once auth is fixed — CSRF matters for authenticated sessions).

---

## 4. Verification checklist (mark done only after re-testing)

- [ ] `GET /admin` unauthenticated → redirect/401, no data in response body
- [ ] `GET /admin/clients/new` unauthenticated → redirect/401
- [ ] `GET /admin/settings` unauthenticated → redirect/401
- [ ] `POST` to client-create / credit-assign endpoint unauthenticated → 401
- [ ] `POST` to redeem endpoint unauthenticated → 401
- [ ] All of the above re-tested **with a valid staff session** → still work correctly (no regression)
- [ ] Rate limiting confirmed on admin API routes
- [ ] Auth failure logging confirmed working

---

## 5. Notes for the agent implementing this

- Stack: Astro (static/SSR) frontend, Node.js/Netlify functions backend, public API endpoints for activities/packages/signup already exist — the admin auth gap is separate from those public endpoints, don't touch the public ones.
- Design tokens / visual system are irrelevant to this fix — this is backend/auth work only, no UI changes expected beyond an `/admin/login` page if one doesn't already exist.
- Trilingual/RTL requirements do not apply here.
- If `/admin/login` doesn't exist yet, it needs to be built as part of P0 (session-issuing endpoint + login form), since the middleware above assumes it does.
