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
} from "@/lib/swim-subscription";

export const dynamic = "force-dynamic";

const recordSwimPaymentSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().int().positive().max(10_000_000),
  method: z.string().trim().min(1).max(60).optional().default("cash"),
  notes: z.string().trim().max(500).nullable().optional(),
  targetMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
  isNextMonth: z.boolean().optional().default(false),
  extendSubscription: z.boolean().optional().default(true),
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
      const isAdvanceNextMonth = isNextMonth || Boolean(targetMonth);

      let finalPaymentNotes = notes?.trim() || null;
      let newSubscriptionEnd: Date | undefined = undefined;
      let updatedMemberNotes: string | undefined = undefined;
      let targetMonthKey: string | undefined = undefined;

      if (isAdvanceNextMonth) {
        const targetDate = targetMonth
          ? new Date(`${targetMonth}-01T00:00:00.000Z`)
          : getNextMonthDate(member.subscriptionEnd);

        targetMonthKey = formatMonthKey(targetDate);
        const tag = `[NEXT_MONTH:${targetMonthKey}]`;
        const monthLabel = formatMonthLabel(targetDate, "fr");

        if (!finalPaymentNotes) {
          finalPaymentNotes = `${tag} Paiement abonnement mois prochain (${monthLabel})`;
        } else if (!finalPaymentNotes.includes(tag)) {
          finalPaymentNotes = `${tag} ${finalPaymentNotes}`;
        }

        if (extendSubscription && isStarter) {
          const nextEnd = getLastDayOfSameMonth(targetDate);
          if (!member.subscriptionEnd || nextEnd > new Date(member.subscriptionEnd)) {
            newSubscriptionEnd = nextEnd;
          }
          updatedMemberNotes = encodeNextMonthPaidTag(member.notes, targetMonthKey);
        }
      }

      const payment = await tx.swimPayment.create({
        data: {
          memberId,
          amount: paymentAmount,
          method: method || "cash",
          notes: finalPaymentNotes,
          paidAt: new Date(),
        },
      });

      const totalPaid =
        member.payments.reduce((sum, p) => sum + p.amount, 0) + paymentAmount;

      let newStatus = member.paymentStatus;
      if (isAdvanceNextMonth || totalPaid >= member.priceDA) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partial";
      }

      const updatedMember = await tx.swimMember.update({
        where: { id: memberId },
        data: {
          paymentStatus: newStatus,
          ...(newSubscriptionEnd ? { subscriptionEnd: newSubscriptionEnd } : {}),
          ...(updatedMemberNotes ? { notes: updatedMemberNotes } : {}),
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
