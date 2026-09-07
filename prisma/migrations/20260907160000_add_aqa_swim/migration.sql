-- CreateTable
CREATE TABLE "SwimLead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "category" TEXT DEFAULT 'homme',
    "level" TEXT,
    "frequency" TEXT,
    "formula" TEXT,
    "duration" TEXT,
    "preferredDays" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'homme',
    "level" TEXT NOT NULL,
    "coachName" TEXT,
    "schedule" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimMember" (
    "id" TEXT NOT NULL,
    "swimId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "photoUrl" TEXT,
    "dateOfStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL DEFAULT 'homme',
    "level" TEXT NOT NULL,
    "groupId" TEXT,
    "formula" TEXT NOT NULL,
    "duration" TEXT DEFAULT '3m',
    "priceDA" INTEGER NOT NULL DEFAULT 0,
    "coachMessage" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "groupStatus" TEXT NOT NULL DEFAULT 'proposed',
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimCard" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "publicToken" TEXT NOT NULL,
    "cardCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimPayment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwimLead_status_idx" ON "SwimLead"("status");
CREATE INDEX "SwimLead_createdAt_idx" ON "SwimLead"("createdAt");

-- CreateIndex
CREATE INDEX "SwimGroup_level_idx" ON "SwimGroup"("level");
CREATE INDEX "SwimGroup_active_idx" ON "SwimGroup"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SwimMember_swimId_key" ON "SwimMember"("swimId");
CREATE INDEX "SwimMember_groupId_idx" ON "SwimMember"("groupId");
CREATE INDEX "SwimMember_paymentStatus_idx" ON "SwimMember"("paymentStatus");
CREATE INDEX "SwimMember_groupStatus_idx" ON "SwimMember"("groupStatus");
CREATE INDEX "SwimMember_createdAt_idx" ON "SwimMember"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SwimCard_memberId_key" ON "SwimCard"("memberId");
CREATE UNIQUE INDEX "SwimCard_publicToken_key" ON "SwimCard"("publicToken");
CREATE UNIQUE INDEX "SwimCard_cardCode_key" ON "SwimCard"("cardCode");
CREATE INDEX "SwimCard_memberId_idx" ON "SwimCard"("memberId");

-- CreateIndex
CREATE INDEX "SwimPayment_memberId_idx" ON "SwimPayment"("memberId");

-- AddForeignKey
ALTER TABLE "SwimMember" ADD CONSTRAINT "SwimMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SwimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimCard" ADD CONSTRAINT "SwimCard_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimPayment" ADD CONSTRAINT "SwimPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SwimMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
