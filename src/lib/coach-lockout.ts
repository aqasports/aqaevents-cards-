import { prisma } from "@/lib/prisma";

// Per-account lockout for the coach app login, stored in RateLimitBucket.
// The key is separate from the admin login lockout so the two never lock each other.
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;

function keyFor(email: string): string {
  return `coach-login-email:${email.trim().toLowerCase()}`;
}

export async function isCoachLockedOut(email: string): Promise<boolean> {
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key: keyFor(email) } });
  return !!bucket?.lockUntil && new Date() < bucket.lockUntil;
}

export async function recordCoachFailure(email: string): Promise<void> {
  const key = keyFor(email);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
    const expired = !!bucket?.lockUntil && now >= bucket.lockUntil;
    const count = expired ? 1 : (bucket?.count ?? 0) + 1;
    const lockUntil = count >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;
    await tx.rateLimitBucket.upsert({
      where: { key },
      create: { key, count, windowStart: now, lockUntil },
      update: { count, lockUntil },
    });
  });
}

export async function clearCoachFailures(email: string): Promise<void> {
  await prisma.rateLimitBucket.delete({ where: { key: keyFor(email) } }).catch(() => {});
}
