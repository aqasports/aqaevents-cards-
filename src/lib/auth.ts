import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Per-IP rate limiting ─────────────────────────────────────────────────────
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_MAX_ATTEMPTS = 20;

export async function isIpRateLimited(ip: string): Promise<boolean> {
  const key = `login-ip:${ip}`;
  const now = new Date();
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!bucket) return false;
  if (bucket.lockUntil && now < bucket.lockUntil) return true;
  if (now.getTime() - bucket.windowStart.getTime() > IP_WINDOW_MS) return false;
  return bucket.count >= IP_MAX_ATTEMPTS;
}

export async function recordIpAttempt(ip: string): Promise<void> {
  const key = `login-ip:${ip}`;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });

    if (!bucket || now.getTime() - bucket.windowStart.getTime() > IP_WINDOW_MS) {
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now, lockUntil: null },
        update: { count: 1, windowStart: now, lockUntil: null },
      });
      return;
    }

    const newCount = bucket.count + 1;
    const lockUntil = newCount >= IP_MAX_ATTEMPTS ? new Date(now.getTime() + IP_WINDOW_MS) : bucket.lockUntil;

    await tx.rateLimitBucket.update({
      where: { key },
      data: { count: newCount, lockUntil },
    });
  });
}

// ─── Per-email lockout ────────────────────────────────────────────────────────
export async function getFailedAttempts(email: string): Promise<number> {
  const key = `login-email:${email.toLowerCase()}`;
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  return bucket ? bucket.count : 0;
}

export async function isLockedOut(email: string): Promise<boolean> {
  const key = `login-email:${email.toLowerCase()}`;
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (bucket?.lockUntil && new Date() < bucket.lockUntil) {
    return true;
  }
  return false;
}

export async function getLockoutTimeRemaining(email: string): Promise<number> {
  const key = `login-email:${email.toLowerCase()}`;
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (bucket?.lockUntil && new Date() < bucket.lockUntil) {
    return Math.ceil((bucket.lockUntil.getTime() - Date.now()) / 1000); // seconds
  }
  return 0;
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const key = `login-email:${email.toLowerCase()}`;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
    const currentCount = (bucket?.count ?? 0) + 1;
    let lockMs = Math.pow(2, Math.min(currentCount - 1, 10)) * 1000;
    if (currentCount >= 5) {
      lockMs = 15 * 60 * 1000; // 15 minute lockout
    }
    const lockUntil = new Date(now.getTime() + lockMs);

    await tx.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now, lockUntil },
      update: { count: currentCount, lockUntil },
    });
  });
}

export async function resetAttempts(email: string): Promise<void> {
  const key = `login-email:${email.toLowerCase()}`;
  await prisma.rateLimitBucket.delete({ where: { key } }).catch(() => {});
}
