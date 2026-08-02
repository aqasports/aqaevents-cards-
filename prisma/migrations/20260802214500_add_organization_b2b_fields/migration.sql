-- AlterTable: Add B2B Organization management fields safely
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "allowedActivities" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappGroupUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "commChannel" TEXT DEFAULT 'ads_tunnel';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "feedApiKey" TEXT;

-- CreateIndex: Add unique index for feedApiKey
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_feedApiKey_key" ON "Organization"("feedApiKey");
