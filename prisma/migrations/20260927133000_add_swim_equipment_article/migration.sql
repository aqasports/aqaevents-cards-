-- CreateTable SwimEquipmentArticle
-- Additive migration: creates a catalog of swim equipment articles for dynamic store management.
-- No existing tables or rows are modified.

CREATE TABLE "SwimEquipmentArticle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "defaultSellPrice" INTEGER NOT NULL DEFAULT 0,
    "defaultCostPrice" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimEquipmentArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SwimEquipmentArticle_code_key" ON "SwimEquipmentArticle"("code");
