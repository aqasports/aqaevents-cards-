import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const payoutLogs = await prisma.auditLog.findMany({
      where: { action: "COACH_PAYOUT_INVOICE" },
      orderBy: { createdAt: "desc" },
    });

    let recoveredCount = 0;
    const recoveredDetails: Array<{ sessionId: string; coachId: string; invoiceCode: string }> = [];

    for (const log of payoutLogs) {
      if (!log.details) continue;
      try {
        const parsed = JSON.parse(log.details);
        const coachId = parsed.coachId;
        const invoiceCode = parsed.invoiceCode || log.target;
        const sessions: Array<{ sessionId: string }> = parsed.sessions || [];

        if (!coachId || !Array.isArray(sessions)) continue;

        // Verify coach exists in database
        const coachExists = await prisma.coach.findUnique({ where: { id: coachId } });
        if (!coachExists) continue;

        for (const sess of sessions) {
          if (!sess.sessionId) continue;

          const dbSession = await prisma.activitySession.findUnique({
            where: { id: sess.sessionId },
            select: { id: true, coachId: true },
          });

          if (dbSession && !dbSession.coachId) {
            await prisma.activitySession.update({
              where: { id: sess.sessionId },
              data: { coachId },
            });
            recoveredCount++;
            recoveredDetails.push({
              sessionId: sess.sessionId,
              coachId,
              invoiceCode,
            });
          }
        }
      } catch (err) {
        logger.error("Error parsing payout log during recovery:", err);
      }
    }

    return NextResponse.json({
      success: true,
      recoveredCount,
      recoveredDetails,
    });
  } catch (err: unknown) {
    logger.error("POST recover coach assignments error:", err);
    return NextResponse.json(
      { error: "Failed to recover coach assignments" },
      { status: 500 }
    );
  }
}
