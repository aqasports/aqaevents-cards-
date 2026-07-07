-- CreateTable
CREATE TABLE "SessionExpense" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "activityExpenseId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionExpense_sessionId_idx" ON "SessionExpense"("sessionId");

-- CreateIndex
CREATE INDEX "SessionExpense_activityExpenseId_idx" ON "SessionExpense"("activityExpenseId");

-- AddForeignKey
ALTER TABLE "SessionExpense" ADD CONSTRAINT "SessionExpense_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExpense" ADD CONSTRAINT "SessionExpense_activityExpenseId_fkey" FOREIGN KEY ("activityExpenseId") REFERENCES "ActivityExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
