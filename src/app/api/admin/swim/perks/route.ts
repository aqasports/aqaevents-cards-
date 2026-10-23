import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import { getMemberPaymentSituation } from "@/lib/swim-groups";
import {
  resolveFormulaTier,
  isPremiumFormula,
  parsePerksFromNotes,
  encodePerksInNotes,
  computePerksProgress,
  PerkItem,
  PremiumTierId,
} from "@/lib/swim-perks";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
  subscriptionDaysLeft,
  getSubscriptionStatus,
} from "@/lib/swim-subscription";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/swim/perks ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const tierFilter = searchParams.get("tier"); // "all" | "silver" | "gold" | "diamond"
  const deliveryFilter = searchParams.get("delivery"); // "all" | "pending" | "delivered"
  const q = searchParams.get("q")?.toLowerCase().trim();

  try {
    const members = await prisma.swimMember.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        group: { select: { id: true, name: true, coachName: true, schedule: true } },
      },
    });

    // Filter to premium formulas only (Silver 3m, Gold 6m, Diamond 9m)
    const premiumMembers = members.filter((m) => isPremiumFormula(m.duration, m.formula));

    const enriched = premiumMembers.map((m) => {
      const tier = resolveFormulaTier(m.duration, m.formula) as PremiumTierId;
      const perks = parsePerksFromNotes(m.notes, m);
      const progress = computePerksProgress(perks);
      const situation = getMemberPaymentSituation(m);

      const subStart = m.subscriptionStart
        ? getEffectiveSubscriptionStart(m.subscriptionStart)
        : getEffectiveSubscriptionStart(m.dateOfStart);
      const subEnd = m.subscriptionEnd
        ? new Date(m.subscriptionEnd)
        : computeSubscriptionEnd(subStart, m.duration, undefined, m.formula);
      const daysLeft = subscriptionDaysLeft(subEnd);
      const subStatus = getSubscriptionStatus(subEnd);

      return {
        id: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email,
        category: m.category,
        level: m.level,
        formula: m.formula,
        duration: m.duration || "3m",
        tier,
        group: m.group,
        effectivePriceDA: situation.effectivePriceDA,
        totalPaid: situation.totalPaid,
        debt: situation.debt,
        paymentStatus: m.paymentStatus,
        subStart,
        subEnd,
        daysLeft,
        subStatus,
        perks,
        progress,
        notes: m.notes,
      };
    });

    // Global Statistics
    const totalSubscribers = enriched.length;
    const silverCount = enriched.filter((m) => m.tier === "silver").length;
    const goldCount = enriched.filter((m) => m.tier === "gold").length;
    const diamondCount = enriched.filter((m) => m.tier === "diamond").length;

    let totalPerks = 0;
    let deliveredPerks = 0;
    let pendingPerks = 0;
    let inProgressPerks = 0;
    let fullyDeliveredCount = 0;

    enriched.forEach((m) => {
      totalPerks += m.progress.total;
      deliveredPerks += m.progress.delivered;
      pendingPerks += m.progress.pending;
      inProgressPerks += m.progress.inProgress;
      if (m.progress.isFullyDelivered) {
        fullyDeliveredCount += 1;
      }
    });

    const overallCompletionPercent =
      totalPerks > 0 ? Math.round((deliveredPerks / totalPerks) * 100) : 100;

    // Apply Filters
    let filtered = enriched;
    if (tierFilter && tierFilter !== "all") {
      filtered = filtered.filter((m) => m.tier === tierFilter);
    }
    if (deliveryFilter === "pending") {
      filtered = filtered.filter((m) => !m.progress.isFullyDelivered);
    } else if (deliveryFilter === "delivered") {
      filtered = filtered.filter((m) => m.progress.isFullyDelivered);
    }
    if (q) {
      filtered = filtered.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.swimId.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      members: filtered,
      stats: {
        totalSubscribers,
        silverCount,
        goldCount,
        diamondCount,
        totalPerks,
        deliveredPerks,
        pendingPerks,
        inProgressPerks,
        fullyDeliveredCount,
        pendingDeliveriesCount: totalSubscribers - fullyDeliveredCount,
        overallCompletionPercent,
      },
    });
  } catch (err: unknown) {
    logger.error("GET admin swim perks error:", err);
    return NextResponse.json({ error: "Failed to load premium perks" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/swim/perks ──────────────────────────────────────────────

const updatePerksSchema = z.object({
  memberId: z.string().min(1),
  perkId: z.string().optional(),
  status: z.enum(["pending", "in_progress", "delivered", "cancelled"]).optional(),
  deliveredAt: z.string().nullable().optional(),
  deliveredBy: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  customPerk: z
    .object({
      title: z.string().trim().min(1).max(100),
      description: z.string().trim().max(250).optional(),
    })
    .optional(),
  removePerkId: z.string().optional(),
  replacePerks: z.array(z.any()).optional(),
});

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const parsed = updatePerksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid perk update payload" }, { status: 400 });
    }

    const {
      memberId,
      perkId,
      status,
      deliveredAt,
      deliveredBy,
      notes: perkNotes,
      customPerk,
      removePerkId,
      replacePerks,
    } = parsed.data;

    const member = await prisma.swimMember.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    let currentPerks = parsePerksFromNotes(member.notes, member);

    if (Array.isArray(replacePerks)) {
      currentPerks = replacePerks as PerkItem[];
    } else if (removePerkId) {
      currentPerks = currentPerks.filter((p) => p.id !== removePerkId);
    } else if (customPerk) {
      const newCustom: PerkItem = {
        id: `custom_${Date.now()}`,
        title: customPerk.title,
        description: customPerk.description || "",
        status: "pending",
        isCustom: true,
      };
      currentPerks.push(newCustom);
    } else if (perkId && status) {
      const idx = currentPerks.findIndex((p) => p.id === perkId);
      if (idx !== -1) {
        currentPerks[idx] = {
          ...currentPerks[idx],
          status,
          deliveredAt:
            status === "delivered"
              ? deliveredAt || currentPerks[idx].deliveredAt || new Date().toISOString()
              : deliveredAt !== undefined
              ? deliveredAt
              : currentPerks[idx].deliveredAt,
          deliveredBy: deliveredBy !== undefined ? deliveredBy : currentPerks[idx].deliveredBy,
          notes: perkNotes !== undefined ? perkNotes : currentPerks[idx].notes,
        };
      }
    }

    const newNotes = encodePerksInNotes(member.notes, currentPerks);

    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: { notes: newNotes },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        group: { select: { id: true, name: true, coachName: true, schedule: true } },
      },
    });

    const progress = computePerksProgress(currentPerks);

    try {
      await logAdminAction(
        session.user.id,
        "UPDATE_SWIM_PERKS",
        `Swimmer ${member.swimId}`,
        `Updated extra features for ${member.fullName}. Progress: ${progress.percent}% (${progress.delivered}/${progress.total} delivered).`
      );
    } catch (e) {
      logger.error("Audit log failed on perks update:", e);
    }

    return NextResponse.json({
      member: updated,
      perks: currentPerks,
      progress,
    });
  } catch (err: unknown) {
    logger.error("PATCH admin swim perks error:", err);
    return NextResponse.json({ error: "Failed to update perks" }, { status: 500 });
  }
}
