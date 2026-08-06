-- Add organizationId to Card for org-scoped blank card inventory
ALTER TABLE "Card" ADD COLUMN "organizationId" TEXT;

-- Create index on Card.organizationId
CREATE INDEX "Card_organizationId_idx" ON "Card"("organizationId");

-- Add foreign key constraint
ALTER TABLE "Card" ADD CONSTRAINT "Card_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
