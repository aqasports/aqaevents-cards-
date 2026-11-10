# AQA Coaches Pro (React Native + Expo + TypeScript)

Production mobile application (Android + iOS) for AQA Sports swim and apnea coaches, connected to AQA ERP (`/api/coach/*`).

## Architecture Highlights

1. **Shared Zod Contract (`src/contract/index.ts` -> `../src/lib/coach-contract.ts`)**:
   - The mobile app and the Next.js ERP routes share the exact same TypeScript types and Zod validation schemas.
2. **Zero Silent Offline Data Loss (`src/sync/outbox.ts`)**:
   - Only genuine network failures enqueue mutations to the persistent offline outbox.
   - Deterministic HTTP `4xx` server refusals (e.g., evaluating a session before the 1-hour lock or nominating a locked honor badge) are immediately shown to the coach or moved to the inspectable Rejected Queue, never silently dropped.
   - Confirmed logout attempts an outbox flush first, warns the coach if unsynced items remain, and wipes cached member PII from the device.
3. **Zero Background Polling (`src/state/CoachStore.tsx` & `src/notifications/push.ts`)**:
   - Complies with the AQA Free-Tier / Serverless Economy rule: no `setInterval` or background timers.
   - Workspace refreshes occur on `AppState === "active"` foreground resume, pull-to-refresh, or event-driven push notification arrival (`POST /api/coach/push-token` + `src/lib/coach-push.ts`).
   - Session reminders (30 minutes before start) are scheduled 100% locally on the device.
4. **Trilingual (`fr`, `en`, `ar`) + RTL + Western Arabic Numerals (`0-9`)**:
   - Full localization in `src/i18n/translations.ts` with automatic `toWesternNumerals()` enforcement and RTL layout direction.

## Getting Started

```bash
cd coach-mobile
npm install
npx expo start
```

## Building for Android & iOS (EAS Build)

```bash
# Internal preview APK / iOS build
eas build --profile preview --platform all

# Production store builds
eas build --profile production --platform all
```
