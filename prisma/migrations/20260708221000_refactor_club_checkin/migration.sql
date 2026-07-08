-- AlterTable: Alter Club table columns to match refactored schema
ALTER TABLE "Club" RENAME COLUMN "contact" TO "contactName";
ALTER TABLE "Club" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Club" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Club" RENAME COLUMN "token" TO "terminalToken";
ALTER TABLE "Club" RENAME COLUMN "active" TO "isActive";
ALTER TABLE "Club" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Alter Activity table to add clubId relation
ALTER TABLE "Activity" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum: Create new CheckInStatus enum
CREATE TYPE "CheckInStatus" AS ENUM ('SUCCESS', 'DUPLICATE', 'NOT_REDEEMED', 'INVALID_CARD');

-- CreateTable: Create new CheckIn table
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sessionId" TEXT,
    "clubId" TEXT NOT NULL,
    "redemptionId" TEXT,
    "status" "CheckInStatus" NOT NULL DEFAULT 'SUCCESS',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedIp" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- Copy data from ClubCheckIn to CheckIn safely before dropping ClubCheckIn
INSERT INTO "CheckIn" ("id", "clientId", "activityId", "sessionId", "clubId", "status", "scannedAt")
SELECT 
  c.id, 
  c."clientId", 
  s."activityId", 
  c."sessionId", 
  c."clubId", 
  'SUCCESS'::"CheckInStatus", 
  c."checkedAt"
FROM "ClubCheckIn" c
JOIN "ActivitySession" s ON c."sessionId" = s.id;

-- DropTable: Remove old ClubCheckIn table
DROP TABLE "ClubCheckIn";

-- CreateIndex
CREATE INDEX "CheckIn_clubId_scannedAt_idx" ON "CheckIn"("clubId", "scannedAt");
CREATE INDEX "CheckIn_clientId_activityId_idx" ON "CheckIn"("clientId", "activityId");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
