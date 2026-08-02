import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { CollectionsAgent } from "@/lib/ai-agents/collections-agent";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const agent = new CollectionsAgent();
    const result = await agent.runCollectionsCheck();

    return NextResponse.json({
      success: true,
      summary: result,
    });
  } catch (err: any) {
    logger.error("POST /api/admin/ai/collections-check error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to execute collections check" },
      { status: 500 }
    );
  }
}
