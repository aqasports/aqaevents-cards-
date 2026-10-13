import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession, verifyCoachJwt } from "@/lib/coach-auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Coach logout error:", err);
    return NextResponse.json({ success: true });
  }
}
