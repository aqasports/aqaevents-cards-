/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export function getClientIp(request: NextRequest | Request): string {
  const nfIp = request.headers.get("x-nf-client-connection-ip")?.trim();
  if (nfIp) return nfIp;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }
  return "unknown";
}

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
