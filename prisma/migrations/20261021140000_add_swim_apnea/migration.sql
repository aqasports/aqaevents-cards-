-- AQA Apnea: additive migration (4 new tables, no change to existing tables)

-- CreateTable
CREATE TABLE "SwimApneaPack" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionsTotal" INTEGER NOT NULL DEFAULT 4,
    "extraSessions" INTEGER NOT NULL DEFAULT 0,
    "withFins" BOOLEAN NOT NULL DEFAULT false,
    "priceDA" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimApneaPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimApneaRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coachId" TEXT,
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimApneaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimApneaPresence" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "coachId" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimApneaPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimApneaTerminal" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimApneaTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwimApneaPack_memberId_idx" ON "SwimApneaPack"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SwimApneaRecord_clientMutationId_key" ON "SwimApneaRecord"("clientMutationId");

-- CreateIndex
CREATE INDEX "SwimApneaRecord_memberId_kind_recordedAt_idx" ON "SwimApneaRecord"("memberId", "kind", "recordedAt");

-- CreateIndex
CREATE INDEX "SwimApneaPresence_sessionDate_idx" ON "SwimApneaPresence"("sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "SwimApneaPresence_memberId_sessionDate_key" ON "SwimApneaPresence"("memberId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "SwimApneaTerminal_token_key" ON "SwimApneaTerminal"("token");

-- CreateIndex
CREATE INDEX "SwimApneaTerminal_coachId_idx" ON "SwimApneaTerminal"("coachId");

-- AddForeignKey
ALTER TABLE "SwimApneaPack" ADD CONSTRAINT "SwimApneaPack_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimApneaRecord" ADD CONSTRAINT "SwimApneaRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimApneaRecord" ADD CONSTRAINT "SwimApneaRecord_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimApneaPresence" ADD CONSTRAINT "SwimApneaPresence_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimApneaPresence" ADD CONSTRAINT "SwimApneaPresence_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimApneaTerminal" ADD CONSTRAINT "SwimApneaTerminal_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
