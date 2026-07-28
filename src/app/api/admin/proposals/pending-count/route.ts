import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const count = await prisma.activityProposal.count({
      where: { status: "pending" },
    });
    return NextResponse.json({ count });
  } catch (err: unknown) {
    logger.error("GET admin pending proposals count error:", err);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
