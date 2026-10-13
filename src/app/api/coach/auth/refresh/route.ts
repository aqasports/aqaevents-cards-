import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rotateCoachAuthSession } from "@/lib/coach-auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid refresh token format." },
        { status: 400 }
      );
    }

    const res = await rotateCoachAuthSession(parsed.data.refreshToken);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (err) {
    logger.error("Coach token refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh token." },
      { status: 500 }
    );
  }
}
