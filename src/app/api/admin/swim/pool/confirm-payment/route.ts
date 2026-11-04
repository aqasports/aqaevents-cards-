import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import { encodePoolPaidNotes, isMemberPoolPaid, getCurrentFrenchMonth } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

const confirmPaymentSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
  bordereauId: z.string().optional(),
  bordereauRef: z.string().optional(),
  poolId: z.string().optional(),
  month: z.string().optional(),
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

    const { memberIds, bordereauId, bordereauRef, poolId, month, action } = parsed.data;
    const isConfirming = action === "confirm";
    const effectiveMonth = month && month.trim().length > 0 ? month.trim() : getCurrentFrenchMonth();

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
      const alreadyPaid = isMemberPoolPaid(member.notes, effectiveMonth);
      if (isConfirming && alreadyPaid) {
        updatedIds.push(member.id);
        continue;
      }
      if (!isConfirming && !alreadyPaid) {
        updatedIds.push(member.id);
        continue;
      }

      const updatedNotes = encodePoolPaidNotes(member.notes, isConfirming, effectiveMonth);
      await prisma.swimMember.update({
        where: { id: member.id },
        data: { notes: updatedNotes },
      });

      updatedCount++;
      updatedIds.push(member.id);
    }

    // Keep platformSetting swim_pool_bordereaux paymentStatus in sync if bordereauId provided
    if (bordereauId) {
      try {
        const setting = await prisma.platformSetting.findUnique({
          where: { key: "swim_pool_bordereaux" },
        });
        if (setting?.value) {
          const list = JSON.parse(setting.value);
          if (Array.isArray(list)) {
            const nowIso = new Date().toISOString();
            const updatedBordereaux = list.map((b: any) => {
              if (b.id === bordereauId) {
                return {
                  ...b,
                  paymentStatus: isConfirming ? "paid" : "unpaid",
                  paidAt: isConfirming ? nowIso : undefined,
                  updatedAt: nowIso,
                };
              }
              return b;
            });
            await prisma.platformSetting.update({
              where: { key: "swim_pool_bordereaux" },
              data: { value: JSON.stringify(updatedBordereaux) },
            });
          }
        }
      } catch (err: unknown) {
        logger.warn("Could not sync bordereau paymentStatus in platformSetting:", err);
      }
    }

    await logAdminAction(
      session.user.id,
      isConfirming ? "CONFIRM_POOL_PAYMENT" : "REVERT_POOL_PAYMENT",
      `SwimMember:${bordereauId || "bulk"}`,
      JSON.stringify({
        bordereauRef: bordereauRef || null,
        poolId: poolId || null,
        month: effectiveMonth,
        totalMembers: members.length,
        updatedCount,
        memberSwimIds: members.map((m) => m.swimId),
      })
    );

    return NextResponse.json({
      success: true,
      action,
      month: effectiveMonth,
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
