# Staging Environment Setup

This document describes the AQA Events staging environment architecture and setup procedure.

## Architecture

- **Production**: Deploys from `main` branch to `aqasports.com`
- **Staging**: Deploys from `staging` branch to `staging--<site-name>.netlify.app`
- **Production DB**: Supabase project `aqa-events` (PostgreSQL)
- **Staging DB**: Supabase project `aqa-events-staging` (PostgreSQL, free tier)
- **Backup Storage**: Supabase Storage bucket `db-backups` in the staging project

## Environment Variables

The following variables must be set in the Netlify Dashboard, scoped to the **Branch deploys / staging** context:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Staging Supabase pooled connection string | `postgresql://...pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | Staging Supabase direct connection string | `postgresql://...supabase.co:5432/postgres` |
| `NEXTAUTH_URL` | Staging site URL | `https://staging--aqasports.netlify.app` |
| `NEXTAUTH_SECRET` | Unique secret for staging (generate with `openssl rand -base64 32`) | |
| `BACKUP_API_KEY` | Shared secret for the scheduled backup function | |
| `SUPABASE_STORAGE_URL` | Staging Supabase project URL | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Staging Supabase service role key | |

IMPORTANT: Never use production connection strings for any staging variable.

## Setup Steps

### 1. Create Supabase Staging Project

1. Go to https://supabase.com/dashboard
2. Click "New Project" and name it `aqa-events-staging`
3. Select the same region as production for minimal latency
4. Note the project URL, anon key, and service role key
5. Go to Settings > Database to get the connection strings

### 2. Set Netlify Environment Variables

1. Go to Netlify Dashboard > Site > Site configuration > Environment variables
2. For each variable above, set the value and scope it to "Branch deploys" or specifically the "staging" branch
3. Verify that none of the staging variables match production values

### 3. Create and Push the Staging Branch

```bash
git checkout main
git checkout -b staging
git push origin staging
```

### 4. Verify Deployment

1. Check the Netlify deploy log for the staging branch
2. Verify `safe-migrate.js` runs against the staging database
3. Access the staging URL and verify the application loads
4. Check the health endpoint: `https://staging--<site>.netlify.app/api/health`

### 5. Create Backup Storage Bucket

1. In the `aqa-events-staging` Supabase project, go to Storage
2. Create a new bucket named `db-backups`
3. Set it as private (not public)
4. The scheduled backup function will upload backups here daily

## Backup Rotation

The backup system retains dumps for 14 days, then automatically deletes older files to stay within the 1 GB free-tier storage quota.

Note: Both production and staging Supabase projects are under the same account. If an account-level issue (billing, suspension) occurs, both projects are affected. Consider an occasional off-Supabase backup copy once the business justifies the extra step.

## Scheduled Functions

| Function | Schedule | Purpose |
|---|---|---|
| `keep-alive` | `0 0 * * *` (midnight UTC) | Pings /api/health to prevent Supabase pause |
| `scheduled-backup` | `0 2 * * *` (02:00 UTC) | Triggers backup and uploads to Supabase Storage |
