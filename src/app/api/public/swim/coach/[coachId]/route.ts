import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decodeSolidNotes, decodeMemberGroupIds } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/swim/coach/[coachId]
 *
 * Public read-only terminal endpoint for a coach to view their assigned
 * swim groups and the payment situation of each swimmer.
 *
 * No authentication required — the coach ID acts as the opaque access token.
 * Returns only the data the coach needs: groups, swimmers, and payment status.
 * Phone numbers are partially masked for privacy.
 * No PII (emails, full addresses) is exposed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
) {
  const { coachId } = await params;

  try {
    // Verify coach exists and is active
    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
      select: {
        id: true,
        name: true,
        phone: true,
        specialties: true,
        active: true,
      },
    });

    if (!coach || !coach.active) {
      return NextResponse.json(
        { error: "Coach not found or inactive." },
        { status: 404 }
      );
    }

    // Find all active groups where coachName matches this coach's name
    const groups = await prisma.swimGroup.findMany({
      where: {
        coachName: coach.name,
        active: true,
      },
      include: {
        swimmers: {
          include: {
            payments: {
              orderBy: { paidAt: "desc" },
              select: { id: true, amount: true, method: true, paidAt: true },
            },
            card: {
              select: { cardCode: true, status: true },
            },
          },
          orderBy: { fullName: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Also find secondary multi-group swimmers for each group
    // (members assigned via [GROUPS:...] tag in notes)
    const allGroupIds = groups.map((g) => g.id);

    const secondarySwimmersByGroup: Record<string, typeof groups[0]["swimmers"]> = {};

    if (allGroupIds.length > 0) {
      const secondaryMembers = await prisma.swimMember.findMany({
        where: {
          groupId: { notIn: allGroupIds, not: null },
          notes: { contains: "[GROUPS:" },
        },
        include: {
          payments: {
            orderBy: { paidAt: "desc" },
            select: { id: true, amount: true, method: true, paidAt: true },
          },
          card: {
            select: { cardCode: true, status: true },
          },
        },
        orderBy: { fullName: "asc" },
      });

      for (const member of secondaryMembers) {
        const assignedGroups = decodeMemberGroupIds(member.notes, member.groupId);
        for (const gid of assignedGroups) {
          if (allGroupIds.includes(gid) && member.groupId !== gid) {
            if (!secondarySwimmersByGroup[gid]) {
              secondarySwimmersByGroup[gid] = [];
            }
            secondarySwimmersByGroup[gid].push(member as unknown as typeof groups[0]["swimmers"][0]);
          }
        }
      }
    }

    // Shape the response — mask phone, compute payment summary
    const shapedGroups = groups.map((g) => {
      const { isSolid, cleanNotes } = decodeSolidNotes(g.notes);
      const primary = g.swimmers;
      const secondary = secondarySwimmersByGroup[g.id] ?? [];
      const allSwimmers = [...primary, ...secondary];

      const swimmers = allSwimmers.map((s) => {
        const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, s.priceDA - totalPaid);
        const maskedPhone = maskPhone(s.phone);

        return {
          id: s.id,
          swimId: s.swimId,
          fullName: s.fullName,
          phone: maskedPhone,
          category: s.category,
          level: s.level,
          formula: s.formula,
          duration: s.duration,
          priceDA: s.priceDA,
          paymentStatus: s.paymentStatus,
          groupStatus: s.groupStatus,
          totalPaid,
          remaining,
          paymentCount: s.payments.length,
          cardCode: s.card?.cardCode ?? null,
          cardStatus: s.card?.status ?? null,
          subscriptionStart: s.subscriptionStart,
          subscriptionEnd: s.subscriptionEnd,
        };
      });

      // Group-level payment summary
      const totalExpected = swimmers.reduce((sum, s) => sum + s.priceDA, 0);
      const totalCollected = swimmers.reduce((sum, s) => sum + s.totalPaid, 0);
      const paidCount = swimmers.filter((s) => s.paymentStatus === "paid").length;
      const partialCount = swimmers.filter((s) => s.paymentStatus === "partial").length;
      const unpaidCount = swimmers.filter((s) => s.paymentStatus === "unpaid").length;

      return {
        id: g.id,
        name: g.name,
        category: g.category,
        level: g.level,
        schedule: g.schedule,
        capacity: g.capacity,
        isSolid,
        cleanNotes,
        swimmers,
        summary: {
          total: swimmers.length,
          paidCount,
          partialCount,
          unpaidCount,
          totalExpected,
          totalCollected,
          collectionRate:
            totalExpected > 0
              ? Math.round((totalCollected / totalExpected) * 100)
              : 0,
        },
      };
    });

    return NextResponse.json({
      coach: {
        id: coach.id,
        name: coach.name,
        specialties: coach.specialties,
      },
      groups: shapedGroups,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    logger.error("GET public swim coach terminal error:", err);
    return NextResponse.json(
      { error: "Failed to load coach data." },
      { status: 500 }
    );
  }
}

/**
 * Masks a phone number for privacy, showing only the last 3 digits.
 * e.g. "+213 555 123 456" -> "+213 *** *** 456"
 */
function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length <= 4) return "***";
  const visible = cleaned.slice(-3);
  const masked = "*".repeat(Math.max(0, cleaned.length - 3));
  return masked + visible;
}
