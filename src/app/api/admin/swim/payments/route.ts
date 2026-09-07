import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { memberId, amount, method, notes } = body;

    if (!memberId || amount === undefined) {
      return NextResponse.json(
        { error: "memberId and amount are required" },
        { status: 400 }
      );
    }

    const member = await prisma.swimMember.findUnique({
      where: { id: memberId },
      include: { payments: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    const paymentAmount = parseInt(amount, 10);
    const payment = await prisma.swimPayment.create({
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

    const updatedMember = await prisma.swimMember.update({
      where: { id: memberId },
      data: { paymentStatus: newStatus },
      include: { payments: true, group: true },
    });

    return NextResponse.json({ payment, member: updatedMember }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST record swim payment error:", err);
    return NextResponse.json({ error: "Failed to record swim payment" }, { status: 500 });
  }
}
