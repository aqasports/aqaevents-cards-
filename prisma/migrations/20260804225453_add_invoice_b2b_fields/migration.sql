-- AlterTable: Add missing Invoice columns safely for production
-- These columns exist in schema.prisma but were never migrated to the production database.
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 19;
