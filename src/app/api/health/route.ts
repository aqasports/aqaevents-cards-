/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Run a very fast, cheap query to verify DB connectivity and keep the project active
    await prisma.$queryRaw`SELECT 1`;

    // Clean up RateLimitBucket rows where windowStart is older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cleaned = await prisma.rateLimitBucket.deleteMany({
      where: {
        windowStart: { lt: cutoff },
      },
    });

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      cleanedRateLimitBuckets: cleaned.count,
    });
  } catch (error: any) {
    logger.error("Health check failed:", error);
    return NextResponse.json(
      { status: "unhealthy", error: error.message || String(error) },
      { status: 500 }
    );
  }
}
