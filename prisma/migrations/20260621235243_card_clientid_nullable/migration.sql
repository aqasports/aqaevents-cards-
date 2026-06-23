-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "publicToken" TEXT NOT NULL,
    "cardCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Card_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("cardCode", "clientId", "id", "issuedAt", "publicToken", "status") SELECT "cardCode", "clientId", "id", "issuedAt", "publicToken", "status" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE UNIQUE INDEX "Card_publicToken_key" ON "Card"("publicToken");
CREATE UNIQUE INDEX "Card_cardCode_key" ON "Card"("cardCode");
CREATE INDEX "Card_clientId_idx" ON "Card"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
