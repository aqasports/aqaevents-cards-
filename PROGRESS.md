# AQA Event Card System — Implementation Progress

## PHASE 0 — Fix Now (integrity & trust, no schema changes needed for most)
- [x] Prompt 1 — Lock down the public card-purchase endpoint (fixes audit finding C-1)
- [x] Prompt 2 — Require super_admin + audit logging for ledger edits (fixes H-1)
- [x] Prompt 3 — Audit-log invoice status changes and deletion (fixes H-2)
- [x] Prompt 4 — Move rate limiting & login lockout to a shared store (fixes H-3)
- [x] Prompt 5 — Centralize the credit-rate constant (fixes M-1, unblocks B2B pricing)
- [x] Prompt 6 — Add bot protection to public lead forms (fixes M-2)
- [x] Prompt 7 — Wire up real notifications (fixes M-3, prerequisite for Phase 3)

## PHASE 1 — B2B / Organization Layer
- [x] Prompt 8 — Organization data model
- [x] Prompt 9 — Bulk employee provisioning for an Organization
- [x] Prompt 10 — Consolidated per-organization invoicing

## PHASE 2 — Financial Reporting Depth
- [x] Prompt 11 — Coach model (replaces localStorage, fixes audit finding C-2)
- [x] Prompt 12 — Equipment/Asset model for boats and gear
- [x] Prompt 13 — Event/session profitability engine + "Best Event" report
- [x] Prompt 14 — Invoice statements, exports, and A/R aging report

## PHASE 3 — Advertising & Marketing Tooling
- [x] Prompt 15 — Marketing consent + lead attribution
- [x] Prompt 16 — Campaign / promo code model
- [x] Prompt 17 — Ads Manager funnel dashboard

## PHASE 4 — LLM Read-Only Analyst
- [x] Prompt 18 — Read-only DB role + curated AI tool layer
- [x] Prompt 19 — Weekly insight digest + anomaly detection
- [x] Prompt 20 — Human-approved write queue for the AI assistant

## PHASE 5 — Additional Features
- [x] Prompt 21 — Client self-service login/portal
- [x] Prompt 22 — Session waitlists
- [x] Prompt 23 — Automated invoice PDFs emailed to clients/organizations
