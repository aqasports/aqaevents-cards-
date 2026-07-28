import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { AI_TOOL_REGISTRY } from "@/lib/ai-tools";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { toolName, args } = body;

    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json(
        { error: "toolName string is required" },
        { status: 400 }
      );
    }

    const toolFn = AI_TOOL_REGISTRY[toolName];
    if (!toolFn) {
      return NextResponse.json(
        {
          error: `Unknown toolName '${toolName}'. Available tools: ${Object.keys(
            AI_TOOL_REGISTRY
          ).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const result = await toolFn(args || {});

    return NextResponse.json({
      success: true,
      toolName,
      result,
    });
  } catch (err: unknown) {
    logger.error("POST AI query error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `AI Tool Execution Failed: ${details}` },
      { status: 500 }
    );
  }
}
