-- AddColumn subscriptionStart and subscriptionEnd to SwimMember
-- Additive migration: no existing rows are modified, both columns are nullable.

ALTER TABLE "SwimMember" ADD COLUMN "subscriptionStart" TIMESTAMP(3);
ALTER TABLE "SwimMember" ADD COLUMN "subscriptionEnd" TIMESTAMP(3);
