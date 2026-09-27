-- CreateTable SwimEquipmentSale
-- Additive migration: creates a new table for tracking equipment sales and profit calculations.
-- No existing tables or rows are modified.

CREATE TABLE "SwimEquipmentSale" (
    "id" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "leadId" TEXT,
    "sellPrice" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimEquipmentSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwimEquipmentSale_article_idx" ON "SwimEquipmentSale"("article");

-- CreateIndex
CREATE INDEX "SwimEquipmentSale_soldAt_idx" ON "SwimEquipmentSale"("soldAt");
