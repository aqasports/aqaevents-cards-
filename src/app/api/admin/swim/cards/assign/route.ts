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
    const { cardCode, memberSwimId, memberId } = body;

    if (!cardCode || (!memberSwimId && !memberId)) {
      return NextResponse.json(
        { error: "Card code and member ID/swim ID are required" },
        { status: 400 }
      );
    }

    const member = await prisma.swimMember.findFirst({
      where: memberId ? { id: memberId } : { swimId: memberSwimId.trim().toUpperCase() },
    });

    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    const card = await prisma.swimCard.findUnique({
      where: { cardCode: cardCode.trim().toUpperCase() },
    });

    if (!card) {
      return NextResponse.json({ error: "Swim card not found" }, { status: 404 });
    }

    if (card.memberId && card.memberId !== member.id) {
      return NextResponse.json(
        { error: "This card is already assigned to another swimmer" },
        { status: 400 }
      );
    }

    // Check if member already has a different card and unlink it
    await prisma.swimCard.updateMany({
      where: { memberId: member.id, id: { not: card.id } },
      data: { memberId: null },
    });

    const updatedCard = await prisma.swimCard.update({
      where: { id: card.id },
      data: { memberId: member.id },
      include: { member: true },
    });

    return NextResponse.json(updatedCard);
  } catch (err: unknown) {
    logger.error("POST assign swim card error:", err);
    return NextResponse.json({ error: "Failed to assign swim card" }, { status: 500 });
  }
}
