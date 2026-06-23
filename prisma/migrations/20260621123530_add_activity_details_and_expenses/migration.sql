-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Activity" ADD COLUMN "places" TEXT;

-- CreateTable
CREATE TABLE "ActivityExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityExpense_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActivityExpense_activityId_idx" ON "ActivityExpense"("activityId");
