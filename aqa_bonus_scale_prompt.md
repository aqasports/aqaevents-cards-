# AQA Event Card System — Bonus Activity Scale Implementation

## Context

The system already has a `Package` model and a `LedgerEntry` model. The ledger uses a `delta` field (positive for credits, negative for debits). A client's balance is computed dynamically by summing all deltas — there is no static balance column.

We are replacing the current flat package system with a **bonus activity scale**. The base price is **1,900 DA per activity**. Clients pay for N activities and receive bonus credits on top, depending on the tier they purchase.

---

## The Bonus Scale

| Tier    | Paid activities | Bonus | Total credited | Effective rate |
|---------|----------------|-------|----------------|----------------|
| Solo    | 1–6            | 0     | = paid         | 1,900 DA       |
| Starter | 7              | +1    | 8              | 1,662 DA       |
| Value   | 10             | +2    | 12             | 1,583 DA       |
| Club    | 20             | +5    | 25             | 1,520 DA       |
| Pro     | 30             | +9    | 39             | 1,462 DA       |
| Elite   | 50             | +17   | 67             | 1,418 DA       |

**Important:** the client pays `paid × 1,900 DA`. The ledger is credited with `paid + bonus` credits. The bonus activities are free — they must never appear as a separate financial transaction.

---

## Required Changes

### 1. Update the `Package` model (`schema.prisma`)

Add a `bonusCredits` field:

```prisma
model Package {
  id            String  @id @default(cuid())
  name          String
  creditAmount  Int     // Activities the client pays for
  bonusCredits  Int     @default(0) // Free bonus activities added on top
  totalCredits  Int     // Computed: creditAmount + bonusCredits — store for display convenience
  price         Float   // creditAmount × 1900
  active        Boolean @default(true)
  sortOrder     Int     @default(0)
}
```

Run `prisma migrate dev --name add_bonus_credits`.

---

### 2. Seed the six packages

Create or update the database seed (`prisma/seed.ts`) with the following packages:

```ts
const packages = [
  { name: 'Solo',    creditAmount: 1,  bonusCredits: 0,  totalCredits: 1,  price: 1900  },
  { name: 'Starter', creditAmount: 7,  bonusCredits: 1,  totalCredits: 8,  price: 13300 },
  { name: 'Value',   creditAmount: 10, bonusCredits: 2,  totalCredits: 12, price: 19000 },
  { name: 'Club',    creditAmount: 20, bonusCredits: 5,  totalCredits: 25, price: 38000 },
  { name: 'Pro',     creditAmount: 30, bonusCredits: 9,  totalCredits: 39, price: 57000 },
  { name: 'Elite',   creditAmount: 50, bonusCredits: 17, totalCredits: 67, price: 95000 },
];
```

Each `price` = `creditAmount × 1900`. The `bonusCredits` are never charged.

---

### 3. Update the credit ledger logic (`lib/balance.ts` or the recharge API)

When a package is applied to a client, the `LedgerEntry` must use `totalCredits` as the delta, not `creditAmount`:

```ts
await prisma.ledgerEntry.create({
  data: {
    clientId,
    cardId,
    packageId: pkg.id,
    delta: pkg.totalCredits,  // ← always totalCredits, never creditAmount
    type: 'credit',
    reason: `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`,
    createdById: session.user.id,
  }
});
```

The `reason` field must make the bonus transparent in the audit log.

---

### 4. Update the admin UI (`/admin/clients/new` and `/admin/clients/[id]`)

When displaying packages for selection, show both the paid count and the bonus clearly:

```
Value — pay for 10, get 12 activities — 19,000 DA
```

Never show the effective rate (1,583 DA) in the UI — this is internal information. Only show what the client pays and what they receive.

Mark the **Value** package as recommended / most popular in the UI.

---

### 5. Update the package manager (`/admin/packages`)

- Display `bonusCredits` and `totalCredits` columns in the package list.
- When editing a package, allow updating `bonusCredits`. Auto-compute `totalCredits = creditAmount + bonusCredits` and `price = creditAmount × 1900` on save — these must never be manually overridden.
- Add a read-only "Effective rate" display: `price / totalCredits` formatted as `X,XXX DA / activity`.

---

### 6. Update the public card view (`/app/eventscard/[token]`)

The balance shown to the client on their card must reflect `totalCredits` already (since the ledger delta already includes the bonus). No change needed to the balance calculation — it still sums all `delta` values. Only verify the display label says **"activities remaining"** not "credits".

---

## What must NOT change

- The ledger immutability logic — no static balance column, no changes to the sum-of-deltas approach.
- The double-spend guard in `POST /api/admin/redemptions` — it already reads the correct live balance.
- The `Redemption` model — each activity still costs 1 credit (1 delta unit), regardless of which package was used to load it.
- The `publicToken` and card reissuance logic.

---

## Validation checklist before merging

- [ ] Buying a Starter (7 paid) credits exactly 8 activities to the ledger
- [ ] Buying two Starters (14 paid) credits 16 — less than Value (10 paid = 12)... wait, 2×8=16 > 12. **This is expected and acceptable** — stacking is only blocked at the package level, not enforced by the system. The package UI should make larger tiers clearly more attractive.
- [ ] The audit log `reason` field shows both paid and bonus counts
- [ ] The package manager correctly locks `price` to `creditAmount × 1900`
- [ ] No existing ledger entries are affected by the migration
