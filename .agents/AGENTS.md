# Project Rules -- AQA Events

## Emoji Policy
- **No emojis are allowed anywhere in the project.** This includes HTML content, CSS pseudo-elements, JavaScript strings, comments, documentation, and any other file type.
- Replace any emoji with descriptive SVG icons, text labels, or icon font characters instead.

## General
- All user-facing text should be professional and clean.
- Animations must be subtle -- no dizzy or overwhelming motion effects.

---

## PRODUCTION CODE -- DATA SAFETY RULES (MANDATORY)

> This codebase is LIVE PRODUCTION software used by real clients with real money (credits, invoices, payments).
> Treat every change as if it could cost the business real financial data. Because it can.

### Schema Protection
- NEVER modify `prisma/schema.prisma` without explicit user approval.
- NEVER add, remove, rename, or change the type of any column or model.
- NEVER change `onDelete` behavior on any relation.
- If a feature requires schema changes, present the exact diff and wait for approval before touching the file.

### Destructive Command Ban
- NEVER run `prisma db push`, `prisma migrate reset`, `prisma migrate dev`, or `prisma db execute` commands.
- NEVER add `--accept-data-loss` or `--force-reset` flags to any Prisma command.
- NEVER run any seed script (`seed.ts`, `seed-aqa-activities.js`, `seed-missing.mjs`, etc.).
- NEVER run SQL commands containing DELETE, DROP, TRUNCATE, or ALTER.
- NEVER run scripts from the `prisma/` folder or `scripts/` folder without explicit user approval.

### Financial Data Protection
- NEVER directly modify code in these critical paths without explicit user approval:
  - `src/modules/invoices/` -- invoice and payment logic
  - `src/app/api/admin/clients/[id]/credit/` -- credit operations
  - `src/app/api/admin/clients/[id]/redeem/` -- redemption operations
  - `src/app/api/admin/invoices/` -- invoice endpoints
  - `src/app/api/admin/ledger/` -- ledger entry endpoints
  - `src/app/api/admin/redemptions/` -- redemption endpoints
  - `src/lib/crm.ts` -- CRM sync that recalculates totalSpent
  - Any `LedgerEntry` creation/modification logic
  - Any code that calculates, adds, or deducts client credits

### Migration Safety
- NEVER create or modify migration files in `prisma/migrations/`.
- Schema changes require human review and explicit approval.
- All schema changes must be tested against the LOCAL Docker database first, never production.

### Environment Safety
- NEVER modify `.env`, `.env.local`, or any environment configuration file.
- NEVER read, log, print, or display database connection strings, passwords, or secrets.
- NEVER hardcode database URLs, API keys, or credentials in any file.
- The production database credentials exist ONLY in Netlify environment variables.

### Backup Awareness
- Before suggesting any data-modifying operation, remind the user to run a backup first.
- If a change could affect existing data, warn the user explicitly.

### Testing Requirements
- All new API endpoints that mutate data must include input validation (zod).
- All delete operations must be scoped to specific IDs -- never use `deleteMany({})` without a where clause.
- Test all changes against the local Docker database, not production.

## Automatic Deployment Policy
- Whenever you finish implementing, fixing, or polishing a task, you must automatically stage all changed files, commit them with a descriptive commit message, push to the remote GitHub repository (git push origin main), and trigger a production deployment to Netlify (npx netlify deploy --build --prod). Always verify that the deployment completes successfully.
