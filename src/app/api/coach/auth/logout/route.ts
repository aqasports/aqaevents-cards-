import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCoachJwt } from "@/lib/coach-auth";
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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const payload = verifyCoachJwt(token);
      if (payload?.sessionId) {
        await prisma.coachAuthSession.update({
          where: { id: payload.sessionId },
          data: { revokedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    logger.error("Coach logout error:", err);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  }
}
