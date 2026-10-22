import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const recordSwimPaymentSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().int().positive().max(10_000_000),
  method: z.string().trim().min(1).max(60).optional().default("cash"),
  notes: z.string().trim().max(500).nullable().optional(),
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

    const { memberId, amount: paymentAmount, method, notes } = parsed.data;

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

      const payment = await tx.swimPayment.create({
        data: {
          memberId,
          amount: paymentAmount,
          method: method || "cash",
          notes: notes?.trim() || null,
          paidAt: new Date(),
        },
      });

      const totalPaid =
        member.payments.reduce((sum, p) => sum + p.amount, 0) + paymentAmount;

      let newStatus = member.paymentStatus;
      if (totalPaid >= member.priceDA) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partial";
      }

      const updatedMember = await tx.swimMember.update({
        where: { id: memberId },
        data: { paymentStatus: newStatus },
        include: { payments: true, group: true },
      });

      return { payment, member: updatedMember, deduplicated: false };
    };

    const result =
      typeof (prisma as unknown as { $transaction?: unknown }).$transaction === "function"
        ? await prisma.$transaction((tx) => executePayment(tx as unknown as typeof prisma))
        : await executePayment(prisma);

    if (!result) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    if (!result.deduplicated) {
      await logAdminAction(
        session.user.id,
        "RECORD_SWIM_PAYMENT",
        `Swimmer ${result.member.swimId}`,
        `Recorded ${paymentAmount} DA (${method || "cash"}) for ${result.member.fullName}. Status: ${result.member.paymentStatus}.`
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
