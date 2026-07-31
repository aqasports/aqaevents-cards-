# AQA Event - Agent Rules & Context

This is a **real production business application**. Treat it with production-grade rigor: no trial code, no shortcuts, no half-work.

## Ground Rules (non-negotiable)

1. **Check the rules first.** Before any task, read the rules in the `aqa event` folder (`AGENTS.md`) and in the site folder `C:\Users\dell\Desktop\aqasportsdotpro` (also `AGENTS.md`). Both apply.
2. **Stick to the user's task.** Implement exactly what was asked. Do not add unrequested features, rework unrelated code, or change scope without being asked.
3. **Never touch the production database.** No writes, migrations, destructive queries, or direct edits against production data without explicit permission. Dev/test only unless told otherwise.
4. **Never be lazy.** Deliver complete, fully functional code. No placeholders, no TODOs, no stubbed methods, no truncated responses, no "you can add this later". The build must succeed.
5. **No emojis anywhere** - not in code, comments, UI strings, translations, git commits, or assistant responses.
6. **Standard Western Arabic numerals only** (0-9) - even in Arabic text and translations. Never use Eastern Arabic-Indic or Indian numerals (e.g. ٠١٢٣٤٥٦٧٨٩, ۰۱۲۳۴۵۶۷۸۹).
7. **All AQA projects are production businesses** (AQA Sports, AQA Events Card System, aqasports.com). Never treat them as demos, prototypes, or playgrounds.

## AQA Design Style

Follow the AQA "Dark Ocean" design language, matching aqasports.com and this app's tokens. Do not invent new visual languages.

- **Brand colors**: Sky Blue `#0ea5e9` (primary, hover `#38bdf8`) and AQA Teal `#00f2ff` (accent).
- **Surfaces**: background `#030712`, surface `#0f172a` (slate-900), secondary surface `#1e293b` (slate-800), translucent borders `rgba(255,255,255,0.08)` / `0.15`.
- **Text**: foreground `#f8fafc`, muted `#94a3b8`, muted-light `#64748b`.
- **Status**: success `#10b981`, warning `#f59e0b`, danger `#ef4444`, info `#38bdf8` - each with a soft translucent background variant for badges/indicators.
- **Effects**: subtle cyan glow shadows (`0 0 15px rgba(0,242,255,0.15)`), glowing blur orbs in backgrounds, glassy/dark cards.
- **Radii**: 6 / 10 / 14 / 20px scale.
- **Typography**: Inter (300-800) for UI, JetBrains Mono (400/600) for code/numbers. Font size base 14px, line-height 1.6.
- **Global tokens** live in `src/app/globals.css` as CSS custom properties (`--primary`, `--surface`, `--accent`, `--shadow-glow`, etc.). Use the variables; do not hardcode colors that already exist as tokens.

## Internationalization (i18n)

- The app uses a lightweight i18n context in `src/lib/i18n.tsx` with three locales: `en`, `fr`, `ar`.
- **Every user-facing string must be translated in all three locales** (`en`, `fr`, `ar`) and added to the dictionaries in `src/lib/i18n.tsx`. Do not leave UI text hardcoded in components.
- Arabic (`ar`) is RTL - layout must respect `dir="rtl"` where applicable.
- Remember rule 6 in all translations: Arabic text still uses Western Arabic numerals (0-9).

## Stack & Conventions

- **Framework**: Next.js (App Router), TypeScript, Tailwind CSS v4 (via `@import "tailwindcss"` in `src/app/globals.css`), Zod for validation.
- **Data**: Prisma ORM. Balance is an immutable ledger: `balance = SUM(ledger.delta)`. Never mutate balances directly.
- **Auth**: NextAuth. Roles: `super_admin` / `staff`. Never bypass authorization checks.
- **Tests**: Vitest. Colocated `*.test.ts` files live next to sources in `src/lib/`. When you add or change business logic, add/update tests and run them.
- **Quality bar**: Run `npm run lint` / `npm run typecheck` / `npm run test` (or the equivalent) after changes and fix everything before finishing. Do not claim completion without verification.
- **Security**: Never log secrets. Respect rate limits, captcha, audit trails, and admin security rules already implemented. No emojis (rule 5).

## Verification Checklist Before Done

- [ ] Exactly the requested task, nothing more
- [ ] Build / lint / typecheck / tests pass
- [ ] No placeholders, TODOs, or stubs
- [ ] All user-facing strings localized in en/fr/ar
- [ ] Design matches AQA Dark Ocean tokens
- [ ] No production DB touched
- [ ] No emojis; Western Arabic numerals only
