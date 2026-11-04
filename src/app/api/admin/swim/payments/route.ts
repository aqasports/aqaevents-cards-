import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  isStarterFormula,
  getNextMonthDate,
  getLastDayOfSameMonth,
  formatMonthKey,
  formatMonthLabel,
  encodeNextMonthPaidTag,
  getEffectiveMemberPaymentStatus,
  getStarterBillingCycles,
  parseSidePocketBalance,
  encodeSidePocketBalance,
  encodeLinkedEventCard,
  computeSubscriptionEnd,
  getEffectiveSubscriptionStart,
} from "@/lib/swim-subscription";

export const dynamic = "force-dynamic";

const recordSwimPaymentSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().int().min(0).max(10_000_000),
  method: z.string().trim().min(1).max(60).optional().default("cash"),
  notes: z.string().trim().max(500).nullable().optional(),
  targetMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
  isNextMonth: z.boolean().optional().default(false),
  extendSubscription: z.boolean().optional().default(true),
  action: z.enum([
    "settle",
    "cover_month",
    "upgrade_formula",
    "side_pocket",
    "use_side_pocket",
    "link_event_card",
  ]).optional().default("settle"),
  targetDuration: z.enum(["1m", "3m", "6m", "9m"]).optional(),
  targetFormula: z.string().trim().max(100).optional(),
  targetPriceDA: z.coerce.number().int().min(0).max(10_000_000).optional(),
  sidePocketAmount: z.coerce.number().int().min(0).max(10_000_000).optional(),
  eventCardCode: z.string().trim().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const parsed = recordSwimPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment input (memberId and a positive integer amount are required)" },
        { status: 400 }
      );
    }

    const {
      memberId,
      amount: paymentAmount,
      method,
      notes,
      targetMonth,
      isNextMonth,
      extendSubscription,
      action = "settle",
      targetDuration,
      targetFormula,
      targetPriceDA,
      sidePocketAmount,
      eventCardCode,
    } = parsed.data;

    const executePayment = async (tx: typeof prisma) => {
      const member = await tx.swimMember.findUnique({
        where: { id: memberId },
        include: { payments: true },
      });

      if (!member) {
        return null;
      }

      // Guard against accidental double-click within 5 seconds for identical amount
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const duplicate = member.payments.find(
        (p) =>
          p.amount === paymentAmount &&
          p.method === (method || "cash") &&
          new Date(p.paidAt) >= fiveSecondsAgo
      );
      if (duplicate) {
        return { payment: duplicate, member, deduplicated: true };
      }

      const isStarter = isStarterFormula(member.duration, member.formula);
      const billing = isStarter ? getStarterBillingCycles(member, new Date()) : null;
      const effStatus = getEffectiveMemberPaymentStatus(member);
      const previousPaid = member.payments.reduce((sum, p) => sum + p.amount, 0);

      let finalPaymentNotes = notes?.trim() || "";
      let newSubscriptionEnd: Date | undefined = undefined;
      let updatedMemberNotes: string = member.notes || "";
      let targetMonthKey: string | undefined = undefined;
      let updatedFormula: string | undefined = undefined;
      let updatedDuration: string | undefined = undefined;
      let updatedPriceDA: number | undefined = undefined;

      // Handle Smart Actions
      if (action === "upgrade_formula" && targetDuration && targetDuration !== "1m") {
        updatedDuration = targetDuration;
        updatedFormula = targetFormula || `${member.formula} (${targetDuration})`;
        updatedPriceDA = targetPriceDA && targetPriceDA > 0 ? targetPriceDA : member.priceDA;

        const subStart = getEffectiveSubscriptionStart(member.subscriptionStart ?? member.dateOfStart);
        newSubscriptionEnd = computeSubscriptionEnd(subStart, targetDuration, undefined, updatedFormula);

        const upgradeTag = `[UPGRADE:${targetDuration}]`;
        finalPaymentNotes = `${upgradeTag} ${finalPaymentNotes}`.trim();
      } else if (action === "side_pocket") {
        const deposit = sidePocketAmount ?? paymentAmount;
        const currentPocket = parseSidePocketBalance(member.notes);
        updatedMemberNotes = encodeSidePocketBalance(updatedMemberNotes, currentPocket + deposit);
        finalPaymentNotes = `[SIDE_POCKET_DEPOSIT:${deposit}] ${finalPaymentNotes}`.trim();
      } else if (action === "link_event_card" && eventCardCode) {
        updatedMemberNotes = encodeLinkedEventCard(updatedMemberNotes, eventCardCode, paymentAmount);
        finalPaymentNotes = `[AQA_EVENT_CARD:${eventCardCode}] ${finalPaymentNotes}`.trim();
      } else if (action === "cover_month" || isNextMonth || Boolean(targetMonth)) {
        const resolvedTargetMonth =
          targetMonth || billing?.nextUpcomingMonthKey || effStatus.nextMonthKey;
        const targetDate = new Date(`${resolvedTargetMonth}-01T00:00:00.000Z`);

        targetMonthKey = formatMonthKey(targetDate);
        const tag = `[NEXT_MONTH:${targetMonthKey}]`;
        const monthLabel = formatMonthLabel(targetDate, "fr");

        if (!finalPaymentNotes.includes(tag)) {
          finalPaymentNotes = `${tag} Paiement abonnement mois prochain (${monthLabel}) ${finalPaymentNotes}`.trim();
        }

        if (extendSubscription && isStarter) {
          const nextEnd = getLastDayOfSameMonth(targetDate);
          if (!member.subscriptionEnd || nextEnd > new Date(member.subscriptionEnd)) {
            newSubscriptionEnd = nextEnd;
          }
          updatedMemberNotes = encodeNextMonthPaidTag(updatedMemberNotes, targetMonthKey);
        }
      } else {
        // Standard settlement (action === "settle")
        if (isStarter && billing) {
          const dueKey = billing.currentDueMonthKey;
          targetMonthKey = dueKey;
          const monthTag = `[MONTH:${dueKey}]`;
          if (!finalPaymentNotes.includes(monthTag)) {
            finalPaymentNotes = `${monthTag} Règlement ${billing.currentDueMonthLabel} ${finalPaymentNotes}`.trim();
          }
        }
      }

      // Handle Side Pocket deduction if specified
      if (action === "use_side_pocket" && sidePocketAmount && sidePocketAmount > 0) {
        const currentPocket = parseSidePocketBalance(member.notes);
        updatedMemberNotes = encodeSidePocketBalance(
          updatedMemberNotes,
          Math.max(0, currentPocket - sidePocketAmount)
        );
        finalPaymentNotes = `[USED_SIDE_POCKET:${sidePocketAmount}] ${finalPaymentNotes}`.trim();
      }

      // Create Payment Record (only if paymentAmount > 0)
      let payment = null;
      if (paymentAmount > 0) {
        payment = await tx.swimPayment.create({
          data: {
            memberId,
            amount: paymentAmount,
            method: method || "cash",
            notes: finalPaymentNotes || null,
            paidAt: new Date(),
          },
        });
      } else {
        // If amount is 0 (e.g. metadata-only update or 100% side pocket deduction), use a synthetic receipt
        payment = {
          id: `adj_${Date.now()}`,
          memberId,
          amount: 0,
          method: method || "cash",
          notes: finalPaymentNotes || null,
          paidAt: new Date(),
          createdAt: new Date(),
        };
      }

      const totalPaid = previousPaid + paymentAmount;
      const targetTariff = updatedPriceDA ?? member.priceDA;

      let newStatus = member.paymentStatus;
      if (action === "upgrade_formula") {
        newStatus = totalPaid >= targetTariff ? "paid" : "partial";
      } else if (action === "cover_month" || isNextMonth || totalPaid >= targetTariff) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partial";
      }

      const updatedMember = await tx.swimMember.update({
        where: { id: memberId },
        data: {
          paymentStatus: newStatus,
          ...(updatedDuration ? { duration: updatedDuration } : {}),
          ...(updatedFormula ? { formula: updatedFormula } : {}),
          ...(updatedPriceDA !== undefined ? { priceDA: updatedPriceDA } : {}),
          ...(newSubscriptionEnd ? { subscriptionEnd: newSubscriptionEnd } : {}),
          notes: updatedMemberNotes,
        },
        include: { payments: { orderBy: { paidAt: "desc" } }, group: true },
      });

      return {
        payment,
        member: updatedMember,
        deduplicated: false,
        targetMonthKey,
        newSubscriptionEnd,
      };
    };

    const result =
      typeof (prisma as unknown as { $transaction?: unknown }).$transaction === "function"
        ? await prisma.$transaction((tx) => executePayment(tx as unknown as typeof prisma))
        : await executePayment(prisma);

    if (!result) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    if (!result.deduplicated) {
      const detailSuffix = result.targetMonthKey
        ? ` (Advance payment for next month ${result.targetMonthKey}. Extended end: ${result.newSubscriptionEnd ? result.newSubscriptionEnd.toISOString().split("T")[0] : "unchanged"})`
        : "";
      await logAdminAction(
        session.user.id,
        "RECORD_SWIM_PAYMENT",
        `Swimmer ${result.member.swimId}`,
        `Recorded ${paymentAmount} DA (${method || "cash"}) for ${result.member.fullName}.${detailSuffix} Status: ${result.member.paymentStatus}.`
      ).catch((e) => logger.error("Audit log failed on swim payment:", e));
    }

    return NextResponse.json(
      { payment: result.payment, member: result.member },
      { status: 201 }
    );
  } catch (err: unknown) {
    logger.error("POST record swim payment error:", err);
    return NextResponse.json({ error: "Failed to record swim payment" }, { status: 500 });
  }
}
