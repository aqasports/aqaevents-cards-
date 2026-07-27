-- AlterTable Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "orgRole" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "marketingConsentAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "leadAttribution" TEXT;

-- AlterTable ActivitySession
ALTER TABLE "ActivitySession" ADD COLUMN IF NOT EXISTS "coachId" TEXT;
ALTER TABLE "ActivitySession" ADD COLUMN IF NOT EXISTS "coachPayOverride" INTEGER;
ALTER TABLE "ActivitySession" ADD COLUMN IF NOT EXISTS "maxCapacity" INTEGER;

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- CreateTable Organization
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "creditRate" DOUBLE PRECISION,
    "sharedCreditPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "useSharedPool" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Organization_slug_key
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

-- CreateTable Coach
CREATE TABLE IF NOT EXISTS "Coach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialties" TEXT,
    "defaultPayRate" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Coach_email_key & Coach_phone_key
CREATE UNIQUE INDEX IF NOT EXISTS "Coach_email_key" ON "Coach"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Coach_phone_key" ON "Coach"("phone");

-- CreateTable EquipmentAsset
CREATE TABLE IF NOT EXISTS "EquipmentAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchasePrice" INTEGER NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usefulLifeMonths" INTEGER NOT NULL DEFAULT 36,
    "maintenanceCost" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable EquipmentUsage
CREATE TABLE IF NOT EXISTS "EquipmentUsage" (
    "id" TEXT NOT NULL,
    "equipmentAssetId" TEXT NOT NULL,
    "sessionId" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "EquipmentUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable CampaignPromo
CREATE TABLE IF NOT EXISTS "CampaignPromo" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignPromo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex CampaignPromo_code_key
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignPromo_code_key" ON "CampaignPromo"("code");

-- CreateTable AiActionQueue
CREATE TABLE IF NOT EXISTS "AiActionQueue" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "proposedPayload" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiActionQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable SessionWaitlist
CREATE TABLE IF NOT EXISTS "SessionWaitlist" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "EquipmentUsage_equipmentAssetId_idx" ON "EquipmentUsage"("equipmentAssetId");
CREATE INDEX IF NOT EXISTS "EquipmentUsage_sessionId_idx" ON "EquipmentUsage"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionWaitlist_sessionId_idx" ON "SessionWaitlist"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionWaitlist_clientId_idx" ON "SessionWaitlist"("clientId");
CREATE INDEX IF NOT EXISTS "SessionWaitlist_status_idx" ON "SessionWaitlist"("status");
CREATE INDEX IF NOT EXISTS "AiActionQueue_status_idx" ON "AiActionQueue"("status");
CREATE INDEX IF NOT EXISTS "AiActionQueue_createdAt_idx" ON "AiActionQueue"("createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX IF NOT EXISTS "ActivitySession_coachId_idx" ON "ActivitySession"("coachId");

-- Foreign Keys (Safe constraint creation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_organizationId_fkey') THEN
        ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_organizationId_fkey') THEN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivitySession_coachId_fkey') THEN
        ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EquipmentUsage_equipmentAssetId_fkey') THEN
        ALTER TABLE "EquipmentUsage" ADD CONSTRAINT "EquipmentUsage_equipmentAssetId_fkey" FOREIGN KEY ("equipmentAssetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EquipmentUsage_sessionId_fkey') THEN
        ALTER TABLE "EquipmentUsage" ADD CONSTRAINT "EquipmentUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SessionWaitlist_sessionId_fkey') THEN
        ALTER TABLE "SessionWaitlist" ADD CONSTRAINT "SessionWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SessionWaitlist_clientId_fkey') THEN
        ALTER TABLE "SessionWaitlist" ADD CONSTRAINT "SessionWaitlist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
