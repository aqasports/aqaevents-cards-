import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";

  try {
    const where = status === "all" ? {} : { status };
    const proposals = await prisma.activityProposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(proposals);
  } catch (err: unknown) {
    console.error("GET admin proposals error:", err);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
