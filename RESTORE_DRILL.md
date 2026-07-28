# Restore Drill Report

**Date**: 2026-07-28T15:02:17.958Z

## Backup File

| Field | Value |
|---|---|
| File | `aqa-backup-2026-07-06T14-24-40-220Z.json` |
| Size | 28.5 KB |
| Backup Timestamp | 2026-07-06T14:24:40.220Z |
| Backup Version | 1.0.0 |

## Row Count Verification

| Table | Metadata Count | Actual Count | Status |
|---|---|---|---|
| clients | 6 | 6 | OK |
| cards | 6 | 6 | OK |
| ledgerEntries | 16 | 16 | OK |
| redemptions | 10 | 10 | OK |
| invoices | 6 | 6 | OK |
| packages | 6 | 6 | OK |
| activities | 5 | 5 | OK |
| sessions | 10 | 10 | OK |
| expenses | 11 | 11 | OK |
| auditLogs | 0 | 0 | OK |
| adminUsers | 2 | 2 | OK |
| notificationLogs | 0 | 0 | OK |
| products | 0 | 0 | OK |
| demands | 0 | 0 | OK |
| proposals | 0 | 0 | OK |

## LedgerEntry Verification

The LedgerEntry table is the immutable financial ledger. Its integrity is critical.

- **Metadata count**: 16
- **Actual count**: 16
- **Status**: VERIFIED -- counts match exactly

## Summary

- **Total rows (metadata)**: 78
- **Total rows (actual)**: 78
- **Overall result**: ALL COUNTS MATCH -- backup integrity verified

## Commands Run

```bash
# 1. Verify backup exists
ls -la backups/

# 2. Run restore drill verification
npx tsx scripts/restore-drill.ts C:\Users\dell\Desktop\aqa event\backups\aqa-backup-2026-07-06T14-24-40-220Z.json
```

## Procedure for Full Restore (if needed)

> IMPORTANT: Only restore to a staging/scratch database, NEVER production.

1. Ensure the staging database is available and empty (or use a scratch schema)
2. Set `DATABASE_URL` to point to the staging database
3. Run `npx prisma db push` to create the schema
4. Use a restore script to import the backup JSON data via Prisma
5. Verify row counts match using this drill script
6. Verify application functionality against the restored data
