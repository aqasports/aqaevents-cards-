-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "cardId" TEXT,
    "packageId" TEXT,
    "redemptionId" TEXT,
    "delta" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LedgerEntry" ("cardId", "clientId", "createdAt", "createdById", "delta", "id", "packageId", "reason", "type") SELECT "cardId", "clientId", "createdAt", "createdById", "delta", "id", "packageId", "reason", "type" FROM "LedgerEntry";
DROP TABLE "LedgerEntry";
ALTER TABLE "new_LedgerEntry" RENAME TO "LedgerEntry";
CREATE INDEX "LedgerEntry_clientId_idx" ON "LedgerEntry"("clientId");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
