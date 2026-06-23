-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "cardCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Card_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "totalCredits" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "sessionDate" DATETIME NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "cardId" TEXT,
    "packageId" TEXT,
    "delta" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sessionId" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "staffId" TEXT,
    "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "Redemption_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Redemption_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Redemption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Redemption_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Card_publicToken_key" ON "Card"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Card_cardCode_key" ON "Card"("cardCode");

-- CreateIndex
CREATE INDEX "Card_clientId_idx" ON "Card"("clientId");

-- CreateIndex
CREATE INDEX "ActivitySession_activityId_idx" ON "ActivitySession"("activityId");

-- CreateIndex
CREATE INDEX "ActivitySession_sessionDate_idx" ON "ActivitySession"("sessionDate");

-- CreateIndex
CREATE INDEX "LedgerEntry_clientId_idx" ON "LedgerEntry"("clientId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "Redemption_clientId_idx" ON "Redemption"("clientId");

-- CreateIndex
CREATE INDEX "Redemption_redeemedAt_idx" ON "Redemption"("redeemedAt");
