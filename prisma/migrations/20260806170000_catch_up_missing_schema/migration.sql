-- ============================================================================
-- Catch-up migration: bring production Supabase in sync with schema.prisma
-- This migration adds all tables, columns, indexes, and foreign keys that
-- were defined in schema.prisma but never created via migration SQL.
-- All statements use IF NOT EXISTS / IF NOT EXISTS guards for safety.
-- ============================================================================

-- ─── Organization: 9 missing columns ────────────────────────────────────────
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "nif" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "nis" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "rc" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "defaultPaymentTermDays" INTEGER;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "discountTier" TEXT;

-- ─── Client: 1 missing column ───────────────────────────────────────────────
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- ─── AiActionQueue: 2 missing columns ───────────────────────────────────────
ALTER TABLE "AiActionQueue" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AiActionQueue" ADD COLUMN IF NOT EXISTS "targetEntityId" TEXT;

-- ─── Club: 1 missing column ─────────────────────────────────────────────────
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- ─── OrganizationUser table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "OrganizationUser" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "magicToken" TEXT,
    "magicTokenExp" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationUser_pkey" PRIMARY KEY ("id")
);

-- ─── Contract table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "creditRate" DOUBLE PRECISION,
    "discountTier" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "expiryPolicy" TEXT NOT NULL DEFAULT 'rollover',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- ─── Department table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgetCap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- ─── InvoiceLineItem table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "lineTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- ─── PublicPurchaseRequest table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PublicPurchaseRequest" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_confirmation',
    "confirmationCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicPurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- ─── PlatformSetting table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationUser_magicToken_key" ON "OrganizationUser"("magicToken");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationUser_organizationId_email_key" ON "OrganizationUser"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "OrganizationUser_organizationId_idx" ON "OrganizationUser"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationUser_email_idx" ON "OrganizationUser"("email");
CREATE INDEX IF NOT EXISTS "Contract_organizationId_idx" ON "Contract"("organizationId");
CREATE INDEX IF NOT EXISTS "Contract_status_idx" ON "Contract"("status");
CREATE INDEX IF NOT EXISTS "Department_organizationId_idx" ON "Department"("organizationId");
CREATE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "PublicPurchaseRequest_cardId_idx" ON "PublicPurchaseRequest"("cardId");
CREATE INDEX IF NOT EXISTS "PublicPurchaseRequest_clientId_idx" ON "PublicPurchaseRequest"("clientId");
CREATE INDEX IF NOT EXISTS "PublicPurchaseRequest_confirmationCode_idx" ON "PublicPurchaseRequest"("confirmationCode");
CREATE INDEX IF NOT EXISTS "Client_departmentId_idx" ON "Client"("departmentId");
CREATE INDEX IF NOT EXISTS "AiActionQueue_organizationId_idx" ON "AiActionQueue"("organizationId");

-- ─── Foreign Keys ───────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationUser_organizationId_fkey') THEN
        ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contract_organizationId_fkey') THEN
        ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Department_organizationId_fkey') THEN
        ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_departmentId_fkey') THEN
        ALTER TABLE "Client" ADD CONSTRAINT "Client_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceLineItem_invoiceId_fkey') THEN
        ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublicPurchaseRequest_cardId_fkey') THEN
        ALTER TABLE "PublicPurchaseRequest" ADD CONSTRAINT "PublicPurchaseRequest_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublicPurchaseRequest_clientId_fkey') THEN
        ALTER TABLE "PublicPurchaseRequest" ADD CONSTRAINT "PublicPurchaseRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiActionQueue_organizationId_fkey') THEN
        ALTER TABLE "AiActionQueue" ADD CONSTRAINT "AiActionQueue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
