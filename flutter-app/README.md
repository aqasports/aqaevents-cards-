# AQA Events Admin — Flutter App

Native Android (and iOS-ready) admin app for the AQA Sports Events Card system.
Connects directly to the production API at `https://aqasports.com`.

---

## Prerequisites

- Flutter 3.x (stable channel)
- Android Studio or VS Code with Flutter extension
- Android device or emulator running **Android 5.0+ (API 21+)**

---

## Setup

```bash
# 1. Install dependencies
flutter pub get

# 2. Run in debug mode on a connected device/emulator
flutter run

# 3. Run against local dev server (localhost:3000)
flutter run --dart-define=USE_DEV=true
```

---

## Building the Release APK

```bash
# Generate a keystore (first time only)
keytool -genkey -v -keystore android/app/aqa-release-key.jks \
  -alias aqa -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
flutter build apk --release

# APK output location:
# build/app/outputs/flutter-apk/app-release.apk
```

> Distribute `app-release.apk` directly to staff via WhatsApp / email / USB transfer.

---

## Project Structure

```
lib/
├── main.dart                   # App entry point
├── core/
│   ├── api/
│   │   ├── api_client.dart     # Dio HTTP client + cookie jar
│   │   └── endpoints.dart      # All API endpoint constants
│   ├── auth/
│   │   └── auth_provider.dart  # Auth state (Riverpod)
│   ├── models/                 # Dart model classes
│   └── theme/
│       └── app_theme.dart      # Dark theme tokens
├── features/
│   ├── auth/                   # Login screen
│   ├── shell/                  # App shell (nav bar + drawer)
│   ├── dashboard/              # Dashboard stats
│   ├── clients/                # Clients CRUD
│   ├── redeem/                 # QR scan + redemption
│   ├── activities/             # Activity management
│   ├── packages/               # Package management
│   ├── invoices/               # Invoice list
│   ├── demands/                # Card demand management
│   ├── proposals/              # Activity proposals
│   ├── clubs/                  # Club check-in management
│   ├── reports/                # Charts and reports
│   ├── events/                 # Sessions calendar
│   ├── products/               # Product catalog
│   ├── users/                  # Staff management
│   └── settings/               # App settings + sign out
└── shared/
    └── widgets/                # Reusable UI components
```

---

## Feature Map

| Screen | Description |
|---|---|
| Login | Email + password via NextAuth |
| Dashboard | Live stats + quick actions |
| Clients | Search, create, view ledger, add credits |
| Redeem | Camera QR scan → confirm redemption |
| Activities | List with images, sessions |
| Packages | CRUD with pricing |
| Invoices | Filter by status, pending badge |
| Demands | Accept / reject card demands |
| Proposals | Review activity proposals |
| Clubs | Check-in logs |
| Reports | Summary charts (fl_chart) |
| Events | Upcoming/past sessions |
| Products | Product grid |
| Staff | User list with roles |
| Settings | Profile, sign out |

---

## Key Packages

| Package | Purpose |
|---|---|
| `flutter_riverpod` | State management |
| `dio` + `dio_cookie_manager` | HTTP + session cookies |
| `flutter_secure_storage` | Encrypted session storage |
| `go_router` | Declarative routing + auth guard |
| `mobile_scanner` | Camera QR scanning |
| `fl_chart` | Dashboard charts |
| `google_fonts` | Inter font (matches web) |
| `shimmer` | Skeleton loading |
| `cached_network_image` | Cached activity images |
| `url_launcher` | Tap-to-call / tap-to-email |

---

## Notes

- Session auth uses NextAuth cookie — same credentials as the web admin panel.
- All API calls hit production. Test carefully before distributing.
- The web app at `https://aqasports.com` is completely unaffected.
