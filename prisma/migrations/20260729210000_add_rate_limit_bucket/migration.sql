-- CreateTable
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockUntil" TIMESTAMP(3),

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
