# AQA Event Card System

A full-stack web application for managing prepaid activity cards for AQA Sports outdoor events. Clients receive PVC cards with QR codes; scanning takes them to a public page showing their balance and activity history. Staff manage clients, sell packages, and redeem activities through the admin dashboard.

## Features

| Feature | Description |
|---|---|
| 🃏 **PVC Card QR** | Unique cryptographic tokens per card, never encoding balance or PII |
| ⚖️ **Immutable Ledger** | Balance = `SUM(ledger.delta)` — no editable balance field |
| 📱 **Public Balance Page** | Mobile-first `aqasports.com/eventcard/{token}` — no login required |
| 🖥️ **Admin Dashboard** | Clients, packages, activities, redemptions, reports |
| 🖨️ **Print Export** | Browser-printable QR sheet + CSV manifest for PVC printer |
| 🔐 **Auth** | NextAuth credentials — JWT sessions, role-based (`super_admin`, `staff`) |
| 📊 **Reports** | Redemptions table, activity breakdown, CSV export |

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| ORM | Prisma 6 |
| Database | SQLite (dev) / PostgreSQL (production) |
| Auth | NextAuth v4 + bcrypt |
| QR | `qrcode` npm package |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Validation | Zod |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — the defaults work for local development
```

### 3. Push database schema

```bash
npm run db:push
```

### 4. Seed the database

Creates the admin user + default packages (3/5/8 activities) + sample activities:

```bash
npm run db:seed
```

### 5. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin)

**Default admin credentials:**
- Email: `admin@aqasports.com`
- Password: `admin123`

> ⚠️ Change credentials before going to production.

## Project Structure

```
src/
├── app/
│   ├── admin/              # Admin app (auth-protected)
│   │   ├── login/          # Login page
│   │   └── (dashboard)/    # Dashboard routes (nav layout)
│   │       ├── page.tsx        # Dashboard home
│   │       ├── clients/        # Client list, detail, new client
│   │       ├── packages/       # Package CRUD
│   │       ├── activities/     # Activity + session management
│   │       ├── redeem/         # POS redemption page
│   │       ├── reports/        # Reports + CSV export
│   │       └── print/          # QR print sheet
│   ├── eventcard/[token]/  # Public balance page (no login)
│   └── api/
│       ├── admin/          # Protected admin APIs
│       └── public/cards/   # Public token lookup (rate-limited)
├── components/
│   ├── admin/
│   │   ├── admin-nav.tsx   # Sticky nav with active links + mobile
│   │   └── ui.tsx          # Design system components
│   └── providers/
│       └── session-provider.tsx
├── lib/
│   ├── auth.ts             # bcrypt helpers
│   ├── auth-options.ts     # NextAuth config
│   ├── balance.ts          # getClientBalance — always computes from ledger
│   ├── prisma.ts           # Prisma client singleton
│   ├── tokens.ts           # nanoid token + card code generation
│   └── api-auth.ts         # requireAdminSession helper
└── middleware.ts           # Auth guard on /admin/*
```

## Key Design Decisions

### Immutable Ledger
Balance is never stored — it's always computed:
```sql
SELECT SUM(delta) FROM ledger_entries WHERE client_id = ?
```
Credits are `+N` rows, redemptions are `−N` rows. Adjustments go through new rows with a `reason`. This gives a full, tamper-evident audit trail.

### Token Security
QR codes encode only the public URL:
```
https://aqasports.com/eventcard/{32-char-nanoid}
```
No balance, no name, no PII in the QR. Tokens are generated with `nanoid` using a 62-char alphabet = ~190 bits of entropy.

### Double-spend Prevention
Redemptions use a Prisma `$transaction` that atomically checks balance and records both the `Redemption` and `LedgerEntry` rows.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Prisma DB connection string | `file:./dev.db` or `postgresql://...` |
| `NEXTAUTH_URL` | Full URL of the Next.js app | `https://aqasports.com` |
| `NEXTAUTH_SECRET` | Long random secret for JWT | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Initial admin email (seed) | `admin@aqasports.com` |
| `ADMIN_PASSWORD` | Initial admin password (seed) | strong password |
| `PUBLIC_SITE_URL` | Base URL for QR code links | `https://aqasports.com` |

## Production Deployment

### Switch to PostgreSQL

In `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then:
```bash
npm run db:push
npm run db:seed
```

### Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Set all environment variables in Vercel dashboard
4. Vercel will auto-run `postinstall` (`prisma generate`)

## API Reference

### Public

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/public/cards/:token` | None | Balance + history (rate-limited 60 req/min) |

### Admin (session required)

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/admin/clients` | List / create clients |
| GET/PATCH | `/api/admin/clients/:id` | Client detail + update |
| POST | `/api/admin/clients/:id/credits` | Add credits (package or custom) |
| POST | `/api/admin/clients/:id/reissue-card` | Replace lost card |
| GET/POST | `/api/admin/packages` | List / create packages |
| PATCH/DELETE | `/api/admin/packages/:id` | Update / archive package |
| GET/POST | `/api/admin/activities` | List / create activities |
| POST | `/api/admin/sessions` | Add session date to activity |
| GET/POST | `/api/admin/redemptions` | List / create redemptions |
| GET | `/api/admin/cards/lookup` | Find card by token or code |
| POST | `/api/admin/cards/export` | Generate QR batch (returns JSON) |
| GET | `/api/admin/reports/summary` | Credit/redemption totals |

## Development Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run db:push      # Push Prisma schema to DB
npm run db:seed      # Seed admin + default data
npm run db:studio    # Open Prisma Studio (GUI)
npm run db:generate  # Regenerate Prisma client
```
# aqaevents-cards-
# aqaevents-cards-
# aqaevents-cards-
