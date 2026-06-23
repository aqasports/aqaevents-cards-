/*
  Warnings:

  - You are about to alter the column `amount` on the `ActivityExpense` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `amount` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `price` on the `Package` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityExpense_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityExpense" ("activityId", "amount", "createdAt", "id", "name", "notes") SELECT "activityId", "amount", "createdAt", "id", "name", "notes" FROM "ActivityExpense";
DROP TABLE "ActivityExpense";
ALTER TABLE "new_ActivityExpense" RENAME TO "ActivityExpense";
CREATE INDEX "ActivityExpense_activityId_idx" ON "ActivityExpense"("activityId");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "invoiceCode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "category" TEXT NOT NULL DEFAULT 'package',
    "items" TEXT NOT NULL,
    "notes" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "category", "clientId", "createdAt", "id", "invoiceCode", "items", "notes", "paidAt", "status") SELECT "amount", "category", "clientId", "createdAt", "id", "invoiceCode", "items", "notes", "paidAt", "status" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceCode_key" ON "Invoice"("invoiceCode");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE TABLE "new_Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "totalCredits" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Package" ("active", "bonusCredits", "createdAt", "creditAmount", "id", "name", "price", "sortOrder", "totalCredits") SELECT "active", "bonusCredits", "createdAt", "creditAmount", "id", "name", "price", "sortOrder", "totalCredits" FROM "Package";
DROP TABLE "Package";
ALTER TABLE "new_Package" RENAME TO "Package";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
