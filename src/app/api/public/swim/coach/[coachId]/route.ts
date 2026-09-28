import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  decodeSolidNotes,
  decodeMemberGroupIds,
  parseScheduleSlots,
  FRENCH_DAYS,
} from "@/lib/swim-groups";
import { calculateSwimPrice } from "@/lib/swim-pricing";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
} from "@/lib/swim-subscription";

export const dynamic = "force-dynamic";

/**
 * Computes a chronological sort key based on French weekly days (Lundi -> Dimanche)
 * and session start times so coach groups appear in weekly schedule order.
 */
function getGroupScheduleSortKey(schedule: string): number {
  const slots = parseScheduleSlots(schedule || "");
  if (slots.length === 0 || !slots[0].day) return 999999;

  let minKey = 999999;
  for (const s of slots) {
    if (!s.day) continue;
    const dayIdx = FRENCH_DAYS.findIndex(
      (d) => d.toLowerCase() === s.day.toLowerCase()
    );
    const normDay = dayIdx !== -1 ? dayIdx : 90;
    let mins = 9999;
    if (s.time) {
      const [h, m] = s.time.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        mins = h * 60 + m;
      }
    }
    const key = normDay * 10000 + mins;
    if (key < minKey) {
      minKey = key;
    }
  }
  return minKey;
}

/**
 * GET /api/public/swim/coach/[coachId]
 *
 * Public read-only terminal endpoint for a coach to view their assigned
 * swim groups, all enrolled swimmers (primary + secondary multi-group),
 * remaining blank places up to group capacity, and individual payment status.
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

    const coachNameNorm = coach.name.trim().toLowerCase();

    // Fetch all active groups and match coachName case-insensitively and trimmed
    // Also build a level lookup map for accurate multi-group tariff calculation
    const allActiveGroups = await prisma.swimGroup.findMany({
      where: {
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

    const groupLevelById = new Map<string, string>();
    for (const g of allActiveGroups) {
      groupLevelById.set(g.id, g.level);
    }

    const groups = allActiveGroups
      .filter(
        (g) => (g.coachName ?? "").trim().toLowerCase() === coachNameNorm
      )
      .sort((a, b) => {
        const keyA = getGroupScheduleSortKey(a.schedule);
        const keyB = getGroupScheduleSortKey(b.schedule);
        if (keyA !== keyB) return keyA - keyB;
        return a.name.localeCompare(b.name);
      });

    const allGroupIds = new Set(groups.map((g) => g.id));

    // Fetch ALL multi-group swimmers (including those whose primary groupId
    // is ALSO one of this coach's groups or null) so 2x/3x swimmers are never missed
    const secondarySwimmersByGroup: Record<
      string,
      typeof allActiveGroups[0]["swimmers"]
    > = {};

    if (allGroupIds.size > 0) {
      const multiGroupMembers = await prisma.swimMember.findMany({
        where: {
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

      for (const member of multiGroupMembers) {
        const assignedGroups = decodeMemberGroupIds(
          member.notes,
          member.groupId
        );
        for (const gid of assignedGroups) {
          if (allGroupIds.has(gid)) {
            if (!secondarySwimmersByGroup[gid]) {
              secondarySwimmersByGroup[gid] = [];
            }
            secondarySwimmersByGroup[gid].push(
              member as unknown as typeof allActiveGroups[0]["swimmers"][0]
            );
          }
        }
      }
    }

    // Shape the response — deduplicate swimmers per group and compute individual payment status
    const shapedGroups = groups.map((g) => {
      const { isSolid, cleanNotes } = decodeSolidNotes(g.notes);
      const primary = g.swimmers;
      const secondary = secondarySwimmersByGroup[g.id] ?? [];

      const seenMemberIds = new Set<string>();
      const allSwimmers: typeof primary = [];
      for (const s of [...primary, ...secondary]) {
        if (!seenMemberIds.has(s.id)) {
          seenMemberIds.add(s.id);
          allSwimmers.push(s);
        }
      }

      // Sort combined swimmers alphabetically by fullName
      allSwimmers.sort((a, b) => a.fullName.localeCompare(b.fullName));

      const swimmers = allSwimmers.map((s) => {
        const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);

        // Compute effective price if DB priceDA is 0
        let effectivePriceDA = s.priceDA || 0;
        if (effectivePriceDA <= 0) {
          const memberGids = decodeMemberGroupIds(s.notes, s.groupId);
          const groupTypes =
            memberGids.length > 0
              ? memberGids.map((id) => groupLevelById.get(id) || g.level)
              : [g.level];
          const computed = calculateSwimPrice({
            category: s.category,
            groupTypes,
            duration: s.duration || "3m",
          });
          if (computed > 0) {
            effectivePriceDA = computed;
          }
        }

        const remaining = Math.max(0, effectivePriceDA - totalPaid);

        let effectivePaymentStatus: "paid" | "partial" | "unpaid" = "unpaid";
        if (
          s.paymentStatus === "paid" ||
          (effectivePriceDA > 0 && totalPaid >= effectivePriceDA)
        ) {
          effectivePaymentStatus = "paid";
        } else if (s.paymentStatus === "partial" || totalPaid > 0) {
          effectivePaymentStatus = "partial";
        }

        const subStart = s.subscriptionStart
          ? s.subscriptionStart
          : getEffectiveSubscriptionStart(s.dateOfStart);
        const subEnd = s.subscriptionEnd
          ? s.subscriptionEnd
          : computeSubscriptionEnd(subStart, s.duration);

        return {
          id: s.id,
          swimId: s.swimId,
          fullName: s.fullName,
          category: s.category,
          level: s.level,
          formula: s.formula,
          duration: s.duration,
          priceDA: effectivePriceDA,
          paymentStatus: effectivePaymentStatus,
          groupStatus: s.groupStatus,
          totalPaid,
          remaining,
          paymentCount: s.payments.length,
          cardCode: s.card?.cardCode ?? null,
          cardStatus: s.card?.status ?? null,
          subscriptionStart: subStart,
          subscriptionEnd: subEnd,
        };
      });

      const effectiveCapacity = Math.max(g.capacity || 10, swimmers.length);
      const emptyCount = Math.max(0, effectiveCapacity - swimmers.length);
      const paidCount = swimmers.filter(
        (s) => s.paymentStatus === "paid"
      ).length;
      const partialCount = swimmers.filter(
        (s) => s.paymentStatus === "partial"
      ).length;
      const unpaidCount = swimmers.filter(
        (s) => s.paymentStatus === "unpaid"
      ).length;

      return {
        id: g.id,
        name: g.name,
        category: g.category,
        level: g.level,
        schedule: g.schedule,
        capacity: effectiveCapacity,
        isSolid,
        cleanNotes,
        swimmers,
        summary: {
          total: swimmers.length,
          capacity: effectiveCapacity,
          emptyCount,
          paidCount,
          partialCount,
          unpaidCount,
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
