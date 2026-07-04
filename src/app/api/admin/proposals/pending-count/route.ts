import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

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
    console.error("GET admin pending proposals count error:", err);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
