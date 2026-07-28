import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const count = await prisma.cardDemand.count({
      where: { status: "pending" },
    });
    return NextResponse.json({ count });
  } catch (err: unknown) {
    logger.error("GET pending count API error:", err);
    return NextResponse.json({ error: "Failed to fetch pending count" }, { status: 500 });
  }
}
