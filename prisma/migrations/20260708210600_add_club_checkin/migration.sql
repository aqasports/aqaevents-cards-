-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "requiresCheck" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ActivitySession" ADD COLUMN "clubId" TEXT;

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubCheckIn" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_token_key" ON "Club"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ClubCheckIn_sessionId_cardId_key" ON "ClubCheckIn"("sessionId", "cardId");

-- CreateIndex
CREATE INDEX "ClubCheckIn_clubId_idx" ON "ClubCheckIn"("clubId");

-- CreateIndex
CREATE INDEX "ClubCheckIn_sessionId_idx" ON "ClubCheckIn"("sessionId");

-- CreateIndex
CREATE INDEX "ClubCheckIn_checkedAt_idx" ON "ClubCheckIn"("checkedAt");

-- CreateIndex
CREATE INDEX "ActivitySession_clubId_idx" ON "ActivitySession"("clubId");

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCheckIn" ADD CONSTRAINT "ClubCheckIn_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCheckIn" ADD CONSTRAINT "ClubCheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
