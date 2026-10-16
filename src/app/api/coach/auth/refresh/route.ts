import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rotateCoachAuthSession } from "@/lib/coach-auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

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
        { status: 400, headers: corsHeaders }
      );
    }

    const res = await rotateCoachAuthSession(parsed.data.refreshToken);
    if ("error" in res) {
      return NextResponse.json(
        { error: res.error },
        { status: res.status, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        token: res.data.accessToken,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        expiresIn: res.data.expiresIn,
        sessionId: res.data.sessionId,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("Coach token refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh token." },
      { status: 500, headers: corsHeaders }
    );
  }
}
