/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function checkAndIncrement(
  key: string,
  opts: { windowMs: number; max: number; lockoutMs?: number }
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const execute = async (tx: any) => {
    if (!tx || !tx.rateLimitBucket || typeof tx.rateLimitBucket.findUnique !== "function") {
      return { limited: false };
    }

    const now = new Date();
    const bucket = await tx.rateLimitBucket.findUnique({
      where: { key },
    });

    if (!bucket) {
      await tx.rateLimitBucket.create({
        data: {
          key,
          count: 1,
          windowStart: now,
          lockUntil: null,
        },
      });
      return { limited: false };
    }

    // Check if bucket is currently locked out
    if (bucket.lockUntil && now < bucket.lockUntil) {
      const retryAfterSeconds = Math.ceil(
        (bucket.lockUntil.getTime() - now.getTime()) / 1000
      );
      return { limited: true, retryAfterSeconds };
    }

    // Check if window has expired
    if (now.getTime() - bucket.windowStart.getTime() > opts.windowMs) {
      await tx.rateLimitBucket.update({
        where: { key },
        data: {
          count: 1,
          windowStart: now,
          lockUntil: null,
        },
      });
      return { limited: false };
    }

    // Within window
    const newCount = bucket.count + 1;
    if (newCount > opts.max) {
      let lockUntil: Date | null = bucket.lockUntil;
      let retryAfterSeconds = Math.ceil(
        (opts.windowMs - (now.getTime() - bucket.windowStart.getTime())) / 1000
      );

      if (opts.lockoutMs) {
        lockUntil = new Date(now.getTime() + opts.lockoutMs);
        retryAfterSeconds = Math.ceil(opts.lockoutMs / 1000);
      }

      await tx.rateLimitBucket.update({
        where: { key },
        data: {
          count: newCount,
          lockUntil,
        },
      });

      return { limited: true, retryAfterSeconds };
    }

    await tx.rateLimitBucket.update({
      where: { key },
      data: {
        count: newCount,
      },
    });

    return { limited: false };
  };

  try {
    if (typeof (prisma as any).$transaction === "function") {
      return await (prisma as any).$transaction(execute);
    }
    return await execute(prisma);
  } catch (err) {
    logger.error("Rate limit bucket check error:", err);
    return { limited: false };
  }
}
