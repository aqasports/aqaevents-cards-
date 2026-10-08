import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import { encodePoolPaidNotes, isMemberPoolPaid } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

const confirmPaymentSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
  bordereauId: z.string().optional(),
  bordereauRef: z.string().optional(),
  poolId: z.string().optional(),
  action: z.enum(["confirm", "revert"]).default("confirm"),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = confirmPaymentSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { memberIds, bordereauId, bordereauRef, poolId, action } = parsed.data;
    const isConfirming = action === "confirm";

    const members = await prisma.swimMember.findMany({
      where: {
        OR: [
          { id: { in: memberIds } },
          { swimId: { in: memberIds } },
        ],
      },
      select: {
        id: true,
        swimId: true,
        fullName: true,
        notes: true,
      },
    });

    if (members.length === 0) {
      return NextResponse.json(
        { error: "No matching members found" },
        { status: 404 }
      );
    }

    let updatedCount = 0;
    const updatedIds: string[] = [];

    for (const member of members) {
      const alreadyPaid = isMemberPoolPaid(member.notes);
      if (isConfirming && alreadyPaid) {
        updatedIds.push(member.id);
        continue;
      }
      if (!isConfirming && !alreadyPaid) {
        updatedIds.push(member.id);
        continue;
      }

      const updatedNotes = encodePoolPaidNotes(member.notes, isConfirming);
      await prisma.swimMember.update({
        where: { id: member.id },
        data: { notes: updatedNotes },
      });

      updatedCount++;
      updatedIds.push(member.id);
    }

    await logAdminAction(
      session.user.id,
      isConfirming ? "CONFIRM_POOL_PAYMENT" : "REVERT_POOL_PAYMENT",
      `SwimMember:${bordereauId || "bulk"}`,
      JSON.stringify({
        bordereauRef: bordereauRef || null,
        poolId: poolId || null,
        totalMembers: members.length,
        updatedCount,
        memberSwimIds: members.map((m) => m.swimId),
      })
    );

    return NextResponse.json({
      success: true,
      action,
      updatedCount,
      totalRequested: memberIds.length,
      matchedCount: members.length,
      memberIds: updatedIds,
    });
  } catch (err: unknown) {
    logger.error("POST confirm pool payment error:", err);
    return NextResponse.json(
      { error: "Failed to confirm pool payment" },
      { status: 500 }
    );
  }
}
