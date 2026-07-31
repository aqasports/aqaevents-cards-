import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export interface CoachPayoutSession {
  sessionId: string;
  activityName: string;
  sessionDate: string;
  location: string;
  attendees: number;
  baseRate: number;
  bonusPerAttendee: number;
  totalPay: number;
}

export interface CoachPayout {
  id: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
  coachPhone: string;
  invoiceCode: string;
  startDate: string;
  endDate: string;
  sessions: CoachPayoutSession[];
  totalAmount: number;
  status: "paid" | "unpaid";
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

// Helper to auto-relink sessions in PostgreSQL database based on payout invoices
async function relinkSessionsFromPayouts(payouts: CoachPayout[]) {
  try {
    const coaches = await prisma.coach.findMany({ select: { id: true, name: true, email: true } });

    for (const payout of payouts) {
      if (!payout.sessions || !Array.isArray(payout.sessions) || payout.sessions.length === 0) continue;

      // Match coach by ID or fallback to name/email match
      let targetCoachId = payout.coachId;
      const matchedCoach = coaches.find(
        (c) => c.id === payout.coachId || c.name.toLowerCase() === payout.coachName?.toLowerCase() || (c.email && c.email.toLowerCase() === payout.coachEmail?.toLowerCase())
      );

      if (matchedCoach) {
        targetCoachId = matchedCoach.id;
      }

      if (!targetCoachId) continue;

      const sessionIds = payout.sessions.map((s) => s.sessionId).filter(Boolean);
      if (sessionIds.length > 0) {
        await prisma.activitySession.updateMany({
          where: {
            id: { in: sessionIds },
          },
          data: {
            coachId: targetCoachId,
          },
        });
      }
    }
  } catch (err) {
    logger.error("Error auto-relinking sessions from payouts:", err);
  }
}

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: "COACH_PAYOUT_INVOICE" },
      orderBy: { createdAt: "desc" },
    });

    const payouts: CoachPayout[] = [];
    for (const log of logs) {
      if (log.details) {
        try {
          const parsed = JSON.parse(log.details);
          if (parsed && parsed.id && parsed.invoiceCode) {
            payouts.push(parsed);
          }
        } catch {
          // ignore corrupted logs
        }
      }
    }

    // Auto-relink DB sessions in background whenever payouts are fetched
    if (payouts.length > 0) {
      await relinkSessionsFromPayouts(payouts);
    }

    return NextResponse.json(payouts);
  } catch (err: unknown) {
    logger.error("GET coach payouts error:", err);
    return NextResponse.json({ error: "Failed to fetch coach payouts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const inputPayouts: CoachPayout[] = Array.isArray(body) ? body : [body];

    const savedPayouts: CoachPayout[] = [];

    for (const payout of inputPayouts) {
      if (!payout.invoiceCode || !payout.coachId) continue;

      // Check if this payout invoice code already exists in AuditLog
      const existing = await prisma.auditLog.findFirst({
        where: {
          action: "COACH_PAYOUT_INVOICE",
          target: payout.invoiceCode,
        },
      });

      if (!existing) {
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "COACH_PAYOUT_INVOICE",
            target: payout.invoiceCode,
            details: JSON.stringify(payout),
          },
        });
        savedPayouts.push(payout);
      } else {
        // Update existing record
        await prisma.auditLog.update({
          where: { id: existing.id },
          data: {
            details: JSON.stringify(payout),
          },
        });
        savedPayouts.push(payout);
      }
    }

    // Auto-relink DB sessions for saved payouts
    if (savedPayouts.length > 0) {
      await relinkSessionsFromPayouts(savedPayouts);
    }

    return NextResponse.json({ success: true, count: savedPayouts.length }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST coach payouts error:", err);
    return NextResponse.json({ error: "Failed to save coach payouts" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { id, invoiceCode, status, paidAt } = body;

    if (!id && !invoiceCode) {
      return NextResponse.json({ error: "Invoice ID or code required" }, { status: 400 });
    }

    // Find the log entry by target (invoiceCode) or by inspecting details
    const logs = await prisma.auditLog.findMany({
      where: { action: "COACH_PAYOUT_INVOICE" },
    });

    let targetLog = null;
    let targetPayout: CoachPayout | null = null;

    for (const log of logs) {
      if (log.target === invoiceCode) {
        targetLog = log;
        try { targetPayout = JSON.parse(log.details || "{}"); } catch {}
        break;
      }
      if (log.details) {
        try {
          const parsed = JSON.parse(log.details);
          if (parsed.id === id) {
            targetLog = log;
            targetPayout = parsed;
            break;
          }
        } catch {}
      }
    }

    if (!targetLog || !targetPayout) {
      return NextResponse.json({ error: "Payout invoice not found" }, { status: 404 });
    }

    const updatedPayout: CoachPayout = {
      ...targetPayout,
      status: status || targetPayout.status,
      paidAt: paidAt !== undefined ? paidAt : targetPayout.paidAt,
    };

    await prisma.auditLog.update({
      where: { id: targetLog.id },
      data: {
        details: JSON.stringify(updatedPayout),
      },
    });

    return NextResponse.json(updatedPayout);
  } catch (err: unknown) {
    logger.error("PATCH coach payouts error:", err);
    return NextResponse.json({ error: "Failed to update coach payout" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const invoiceId = request.nextUrl.searchParams.get("id");
  const invoiceCode = request.nextUrl.searchParams.get("code");

  if (!invoiceId && !invoiceCode) {
    return NextResponse.json({ error: "Invoice ID or code required" }, { status: 400 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: "COACH_PAYOUT_INVOICE" },
    });

    let targetLogId = null;

    for (const log of logs) {
      if (invoiceCode && log.target === invoiceCode) {
        targetLogId = log.id;
        break;
      }
      if (log.details) {
        try {
          const parsed = JSON.parse(log.details);
          if (parsed.id === invoiceId) {
            targetLogId = log.id;
            break;
          }
        } catch {}
      }
    }

    if (targetLogId) {
      await prisma.auditLog.delete({ where: { id: targetLogId } });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE coach payout error:", err);
    return NextResponse.json({ error: "Failed to delete coach payout" }, { status: 500 });
  }
}
