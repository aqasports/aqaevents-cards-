import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  computeMemberSubscriptionDates,
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
  subscriptionDaysLeft,
  getSubscriptionStatus,
  isSubscriptionExpiringSoon,
  DEFAULT_EXCLUDED_PERIODS,
} from "@/lib/swim-subscription";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/swim/subscriptions ───────────────────────────────────────
// Returns all members enriched with payment and subscription summary data.

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const paymentFilter = searchParams.get("paymentStatus");
  const expiringOnly = searchParams.get("expiring") === "true";
  const q = searchParams.get("q")?.trim();

  try {
    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { swimId: { contains: q, mode: "insensitive" } },
      ];
    }
    if (paymentFilter && paymentFilter !== "all") {
      where.paymentStatus = paymentFilter;
    }

    const members = await prisma.swimMember.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        group: { select: { id: true, name: true, coachName: true, schedule: true } },
      },
    });

    const enriched = members.map((m) => {
      const totalPaid = m.payments.reduce((s, p) => s + p.amount, 0);
      const debt = Math.max(0, m.priceDA - totalPaid);

      // Compute subscription dates on the fly if not stored
      const subStart = m.subscriptionStart
        ? m.subscriptionStart
        : getEffectiveSubscriptionStart(m.dateOfStart);
      const subEnd = m.subscriptionEnd
        ? m.subscriptionEnd
        : computeSubscriptionEnd(subStart, m.duration);

      const daysLeft = subscriptionDaysLeft(subEnd);
      const subStatus = getSubscriptionStatus(subEnd);
      const expiringSoon = isSubscriptionExpiringSoon(subEnd, 14);

      return {
        ...m,
        totalPaid,
        debt,
        subscriptionStart: subStart,
        subscriptionEnd: subEnd,
        daysLeft,
        subStatus,
        expiringSoon,
      };
    });

    const filtered = expiringOnly
      ? enriched.filter((m) => m.expiringSoon)
      : enriched;

    return NextResponse.json(filtered);
  } catch (err: unknown) {
    logger.error("GET admin swim subscriptions error:", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/swim/subscriptions ─────────────────────────────────────
// Allows admin to override subscriptionStart for a member (recomputes subscriptionEnd).

const PatchSchema = z.object({
  memberId: z.string().min(1),
  subscriptionStart: z.string().min(1), // ISO date string
});

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "memberId and subscriptionStart (ISO date) are required" },
        { status: 400 }
      );
    }

    const { memberId, subscriptionStart: rawStart } = parsed.data;

    const member = await prisma.swimMember.findUnique({
      where: { id: memberId },
      select: { id: true, duration: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const effectiveStart = getEffectiveSubscriptionStart(new Date(rawStart));
    const effectiveEnd = computeSubscriptionEnd(effectiveStart, member.duration);

    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        subscriptionStart: effectiveStart,
        subscriptionEnd: effectiveEnd,
      },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        group: { select: { id: true, name: true, coachName: true, schedule: true } },
      },
    });

    const totalPaid = updated.payments.reduce((s, p) => s + p.amount, 0);
    const debt = Math.max(0, updated.priceDA - totalPaid);
    const daysLeft = subscriptionDaysLeft(effectiveEnd);
    const subStatus = getSubscriptionStatus(effectiveEnd);

    return NextResponse.json({
      ...updated,
      totalPaid,
      debt,
      subscriptionStart: effectiveStart,
      subscriptionEnd: effectiveEnd,
      daysLeft,
      subStatus,
    });
  } catch (err: unknown) {
    logger.error("PATCH admin swim subscriptions error:", err);
    return NextResponse.json({ error: "Failed to update subscription start" }, { status: 500 });
  }
}
