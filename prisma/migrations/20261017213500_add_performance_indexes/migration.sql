-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_target_action_idx" ON "AuditLog"("target", "action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SwimSession_groupId_sessionDate_idx" ON "SwimSession"("groupId", "sessionDate");
