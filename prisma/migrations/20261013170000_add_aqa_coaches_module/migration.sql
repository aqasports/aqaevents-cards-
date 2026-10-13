-- CreateTable CoachAccount
CREATE TABLE "CoachAccount" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'coach',
    "categories" TEXT,
    "loginEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable CoachAuthSession
CREATE TABLE "CoachAuthSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "platform" TEXT,
    "deviceLabel" TEXT,
    "appVersion" TEXT,
    "pushToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable SwimGroupStaff
CREATE TABLE "SwimGroupStaff" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'lead',
    "startsOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimGroupStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable SwimSession
CREATE TABLE "SwimSession" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "cancelReason" TEXT,
    "plannedCoachId" TEXT,
    "actualCoachId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable SwimAttendance
CREATE TABLE "SwimAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'manual',
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "markedByCoachId" TEXT,
    "markedByAdminId" TEXT,
    "clientMutationId" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable SwimTechReview
CREATE TABLE "SwimTechReview" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "coachId" TEXT,
    "sessionId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'assessment',
    "catalogVersion" INTEGER NOT NULL DEFAULT 1,
    "skills" TEXT,
    "metrics" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "nextGoals" TEXT,
    "recommendedLevel" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "status" TEXT NOT NULL DEFAULT 'final',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimTechReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable SwimCoachAbsence
CREATE TABLE "SwimCoachAbsence" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedByCoachId" TEXT,
    "decidedByAdminId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimCoachAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable SwimReplacement
CREATE TABLE "SwimReplacement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "absenceId" TEXT,
    "originalCoachId" TEXT,
    "substituteCoachId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "note" TEXT,
    "requestedByCoachId" TEXT,
    "requestedByAdminId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimReplacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachAccount_coachId_key" ON "CoachAccount"("coachId");
CREATE UNIQUE INDEX "CoachAccount_email_key" ON "CoachAccount"("email");
CREATE INDEX "CoachAccount_role_idx" ON "CoachAccount"("role");
CREATE INDEX "CoachAccount_email_idx" ON "CoachAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachAuthSession_refreshTokenHash_key" ON "CoachAuthSession"("refreshTokenHash");
CREATE INDEX "CoachAuthSession_accountId_idx" ON "CoachAuthSession"("accountId");
CREATE INDEX "CoachAuthSession_expiresAt_idx" ON "CoachAuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SwimGroupStaff_groupId_coachId_startsOn_key" ON "SwimGroupStaff"("groupId", "coachId", "startsOn");
CREATE INDEX "SwimGroupStaff_coachId_idx" ON "SwimGroupStaff"("coachId");
CREATE INDEX "SwimGroupStaff_groupId_idx" ON "SwimGroupStaff"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "SwimSession_groupId_sessionDate_startTime_key" ON "SwimSession"("groupId", "sessionDate", "startTime");
CREATE INDEX "SwimSession_sessionDate_idx" ON "SwimSession"("sessionDate");
CREATE INDEX "SwimSession_actualCoachId_sessionDate_idx" ON "SwimSession"("actualCoachId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "SwimAttendance_sessionId_memberId_key" ON "SwimAttendance"("sessionId", "memberId");
CREATE UNIQUE INDEX "SwimAttendance_clientMutationId_key" ON "SwimAttendance"("clientMutationId");
CREATE INDEX "SwimAttendance_memberId_markedAt_idx" ON "SwimAttendance"("memberId", "markedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SwimTechReview_clientMutationId_key" ON "SwimTechReview"("clientMutationId");
CREATE INDEX "SwimTechReview_memberId_createdAt_idx" ON "SwimTechReview"("memberId", "createdAt");
CREATE INDEX "SwimTechReview_coachId_idx" ON "SwimTechReview"("coachId");
CREATE INDEX "SwimTechReview_status_idx" ON "SwimTechReview"("status");

-- CreateIndex
CREATE INDEX "SwimCoachAbsence_coachId_startsAt_idx" ON "SwimCoachAbsence"("coachId", "startsAt");
CREATE INDEX "SwimCoachAbsence_status_idx" ON "SwimCoachAbsence"("status");

-- CreateIndex
CREATE INDEX "SwimReplacement_sessionId_idx" ON "SwimReplacement"("sessionId");
CREATE INDEX "SwimReplacement_substituteCoachId_status_idx" ON "SwimReplacement"("substituteCoachId", "status");

-- AddForeignKey
ALTER TABLE "CoachAccount" ADD CONSTRAINT "CoachAccount_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAuthSession" ADD CONSTRAINT "CoachAuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimGroupStaff" ADD CONSTRAINT "SwimGroupStaff_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SwimGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimGroupStaff" ADD CONSTRAINT "SwimGroupStaff_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimSession" ADD CONSTRAINT "SwimSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SwimGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SwimSession" ADD CONSTRAINT "SwimSession_plannedCoachId_fkey" FOREIGN KEY ("plannedCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SwimSession" ADD CONSTRAINT "SwimSession_actualCoachId_fkey" FOREIGN KEY ("actualCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimAttendance" ADD CONSTRAINT "SwimAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SwimSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimAttendance" ADD CONSTRAINT "SwimAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimAttendance" ADD CONSTRAINT "SwimAttendance_markedByCoachId_fkey" FOREIGN KEY ("markedByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimTechReview" ADD CONSTRAINT "SwimTechReview_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimTechReview" ADD CONSTRAINT "SwimTechReview_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SwimTechReview" ADD CONSTRAINT "SwimTechReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SwimSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimCoachAbsence" ADD CONSTRAINT "SwimCoachAbsence_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimReplacement" ADD CONSTRAINT "SwimReplacement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SwimSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimReplacement" ADD CONSTRAINT "SwimReplacement_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "SwimCoachAbsence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SwimReplacement" ADD CONSTRAINT "SwimReplacement_originalCoachId_fkey" FOREIGN KEY ("originalCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SwimReplacement" ADD CONSTRAINT "SwimReplacement_substituteCoachId_fkey" FOREIGN KEY ("substituteCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
