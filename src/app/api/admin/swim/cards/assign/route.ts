import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimCardCode, generateSwimToken } from "@/lib/swim-id";
import { z } from "zod";

export const dynamic = "force-dynamic";

const singleAssignSchema = z.object({
  cardCode: z.string().min(1),
  memberSwimId: z.string().optional(),
  memberId: z.string().optional(),
});

const batchAutoIssueSchema = z.object({
  autoIssueMemberIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();

    // Mode 1: Batch auto-issue/assign PVC cards to selected members who lack a card
    if (Array.isArray(body?.autoIssueMemberIds)) {
      const parsedBatch = batchAutoIssueSchema.safeParse(body);
      if (!parsedBatch.success) {
        return NextResponse.json(
          { error: "Invalid member IDs for batch card issue" },
          { status: 400 }
        );
      }

      const memberIds = Array.from(new Set(parsedBatch.data.autoIssueMemberIds));
      const members = await prisma.swimMember.findMany({
        where: { id: { in: memberIds } },
        include: { card: true },
      });

      const membersNeedingCard = members.filter((m) => !m.card);
      if (membersNeedingCard.length === 0) {
        return NextResponse.json({ issuedCount: 0, cards: [] });
      }

      // Grab available blank cards first
      const blankCards = await prisma.swimCard.findMany({
        where: { memberId: null, status: "active" },
        orderBy: { issuedAt: "asc" },
        take: membersNeedingCard.length,
      });

      const issuedCards = [];
      for (let i = 0; i < membersNeedingCard.length; i++) {
        const targetMember = membersNeedingCard[i];
        const existingBlank = blankCards[i];

        if (existingBlank) {
          const updated = await prisma.swimCard.update({
            where: { id: existingBlank.id },
            data: { memberId: targetMember.id },
          });
          issuedCards.push(updated);
        } else {
          let code = generateSwimCardCode();
          let collision = await prisma.swimCard.findUnique({ where: { cardCode: code } });
          while (collision) {
            code = generateSwimCardCode();
            collision = await prisma.swimCard.findUnique({ where: { cardCode: code } });
          }

          const created = await prisma.swimCard.create({
            data: {
              memberId: targetMember.id,
              cardCode: code,
              publicToken: generateSwimToken(),
              status: "active",
            },
          });
          issuedCards.push(created);
        }
      }

      return NextResponse.json({
        issuedCount: issuedCards.length,
        cards: issuedCards,
      });
    }

    // Mode 2: Single card assignment
    const parsedSingle = singleAssignSchema.safeParse(body);
    if (
      !parsedSingle.success ||
      (!parsedSingle.data.memberSwimId && !parsedSingle.data.memberId)
    ) {
      return NextResponse.json(
        { error: "Card code and member ID/swim ID are required" },
        { status: 400 }
      );
    }

    const { cardCode, memberSwimId, memberId } = parsedSingle.data;

    const member = await prisma.swimMember.findFirst({
      where: memberId ? { id: memberId } : { swimId: memberSwimId!.trim().toUpperCase() },
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
