import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { decodeMemberGroupIds } from "@/lib/swim-groups";
import {
  rebuildPaymentNotesOnEdit,
  reconcileMemberAfterPaymentChange,
} from "@/lib/swim-payment-reconcile";

export const dynamic = "force-dynamic";

const updateSwimPaymentSchema = z.object({
  amount: z.coerce.number().int().min(1).max(10_000_000),
  method: z.string().trim().min(1).max(60),
  paidAt: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  cycleMode: z.enum(["keep", "none", "month", "next_month"]).optional().default("keep"),
  cycleMonth: z
    .string()
    .trim()
    .regex(/^[0-9]{4}-[0-9]{2}$/)
    .nullable()
    .optional(),
});

const deleteSwimPaymentSchema = z.object({
  revertUpgrade: z.boolean().optional().default(true),
});

function parsePaymentDate(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  // Anchor YYYY-MM-DD at 12:00 UTC so timezone offsets never shift the calendar day
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(trimmed)) {
    const fallbackDay = fallback.toISOString().split("T")[0];
    if (trimmed === fallbackDay) return fallback;
    return new Date(`${trimmed}T12:00:00.000Z`);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

async function resolveAssignedGroupLevels(
  tx: typeof prisma,
  notes: string | null,
  groupId: string | null,
  directGroup: { level: string; active: boolean } | null
): Promise<string[]> {
  const allGroupIds = decodeMemberGroupIds(notes, groupId);
  if (allGroupIds.length > 0) {
    const groups = await tx.swimGroup.findMany({
      where: { id: { in: allGroupIds } },
      select: { id: true, level: true, active: true },
    });
    groups.sort((a, b) => allGroupIds.indexOf(a.id) - allGroupIds.indexOf(b.id));
    return groups.filter((g) => g.active).map((g) => g.level);
  }
  if (directGroup && directGroup.active) {
    return [directGroup.level];
  }
  return [];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  if (!id || id.trim().length === 0) {
    return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = updateSwimPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment update payload (positive integer amount and valid method required)" },
        { status: 400 }
      );
    }

    const { amount, method, paidAt, notes, cycleMode, cycleMonth } = parsed.data;

    const executeUpdate = async (tx: typeof prisma) => {
      const existing = await tx.swimPayment.findUnique({
        where: { id },
        include: {
          member: {
            include: {
              payments: true,
              group: { select: { level: true, active: true } },
            },
          },
        },
      });

      if (!existing || !existing.member) {
        return null;
      }

      const member = existing.member;
      const assignedGroupLevels = await resolveAssignedGroupLevels(
        tx,
        member.notes,
        member.groupId,
        member.group
      );

      const nextPaidAt = parsePaymentDate(paidAt, new Date(existing.paidAt));
      const rebuiltNotes = rebuildPaymentNotesOnEdit({
        oldNotes: existing.notes,
        oldAmount: existing.amount,
        newAmount: amount,
        newCleanNotes: notes !== undefined ? notes : undefined,
        cycleMode,
        cycleMonth: cycleMonth ?? null,
      });

      const updatedPayment = await tx.swimPayment.update({
        where: { id },
        data: {
          amount,
          method,
          paidAt: nextPaidAt,
          notes: rebuiltNotes,
        },
      });

      const otherPayments = member.payments.filter((p) => p.id !== id);
      const reconciled = reconcileMemberAfterPaymentChange({
        member: {
          category: member.category,
          duration: member.duration,
          formula: member.formula,
          priceDA: member.priceDA,
          paymentStatus: member.paymentStatus,
          notes: member.notes,
          dateOfStart: member.dateOfStart,
          subscriptionStart: member.subscriptionStart,
          subscriptionEnd: member.subscriptionEnd,
        },
        assignedGroupLevels,
        oldPayment: existing,
        updatedPayment,
        otherPayments,
      });

      const updatedMember = await tx.swimMember.update({
        where: { id: member.id },
        data: {
          paymentStatus: reconciled.paymentStatus,
          notes: reconciled.notes,
          duration: reconciled.duration,
          formula: reconciled.formula,
          priceDA: reconciled.priceDA,
          subscriptionEnd: reconciled.subscriptionEnd,
        },
        include: {
          payments: { orderBy: { paidAt: "desc" } },
          group: true,
        },
      });

      return {
        oldPayment: existing,
        payment: updatedPayment,
        member: updatedMember,
      };
    };

    const result =
      typeof (prisma as unknown as { $transaction?: unknown }).$transaction === "function"
        ? await prisma.$transaction((tx) => executeUpdate(tx as unknown as typeof prisma))
        : await executeUpdate(prisma);

    if (!result) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    await logAdminAction(
      session.user.id,
      "UPDATE_SWIM_PAYMENT",
      `Swimmer ${result.member.swimId}`,
      `Edited payment ${id} for ${result.member.fullName}: ${result.oldPayment.amount} DA (${result.oldPayment.method}) -> ${result.payment.amount} DA (${result.payment.method}). New status: ${result.member.paymentStatus}.`
    ).catch((e) => logger.error("Audit log failed on swim payment update:", e));

    return NextResponse.json({ payment: result.payment, member: result.member });
  } catch (err: unknown) {
    logger.error("PATCH swim payment error:", err);
    return NextResponse.json({ error: "Failed to update swim payment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  if (!id || id.trim().length === 0) {
    return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
  }

  try {
    let rawBody: unknown = {};
    try {
      const text = await request.text();
      if (text) rawBody = JSON.parse(text);
    } catch {
      rawBody = {};
    }

    const parsed = deleteSwimPaymentSchema.safeParse(rawBody);
    const revertUpgrade = parsed.success ? parsed.data.revertUpgrade : true;

    const executeDelete = async (tx: typeof prisma) => {
      const existing = await tx.swimPayment.findUnique({
        where: { id },
        include: {
          member: {
            include: {
              payments: true,
              group: { select: { level: true, active: true } },
            },
          },
        },
      });

      if (!existing || !existing.member) {
        return null;
      }

      const member = existing.member;
      const assignedGroupLevels = await resolveAssignedGroupLevels(
        tx,
        member.notes,
        member.groupId,
        member.group
      );

      await tx.swimPayment.delete({
        where: { id },
      });

      const otherPayments = member.payments.filter((p) => p.id !== id);
      const reconciled = reconcileMemberAfterPaymentChange({
        member: {
          category: member.category,
          duration: member.duration,
          formula: member.formula,
          priceDA: member.priceDA,
          paymentStatus: member.paymentStatus,
          notes: member.notes,
          dateOfStart: member.dateOfStart,
          subscriptionStart: member.subscriptionStart,
          subscriptionEnd: member.subscriptionEnd,
        },
        assignedGroupLevels,
        oldPayment: existing,
        updatedPayment: null,
        otherPayments,
        revertUpgrade,
      });

      const updatedMember = await tx.swimMember.update({
        where: { id: member.id },
        data: {
          paymentStatus: reconciled.paymentStatus,
          notes: reconciled.notes,
          duration: reconciled.duration,
          formula: reconciled.formula,
          priceDA: reconciled.priceDA,
          subscriptionEnd: reconciled.subscriptionEnd,
        },
        include: {
          payments: { orderBy: { paidAt: "desc" } },
          group: true,
        },
      });

      return {
        deletedPayment: existing,
        member: updatedMember,
        upgradeReverted: reconciled.upgradeReverted,
      };
    };

    const result =
      typeof (prisma as unknown as { $transaction?: unknown }).$transaction === "function"
        ? await prisma.$transaction((tx) => executeDelete(tx as unknown as typeof prisma))
        : await executeDelete(prisma);

    if (!result) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const revertNote = result.upgradeReverted
      ? " Formula upgrade reverted to Starter (1m)."
      : "";

    await logAdminAction(
      session.user.id,
      "DELETE_SWIM_PAYMENT",
      `Swimmer ${result.member.swimId}`,
      `Erased payment ${id} (${result.deletedPayment.amount} DA, ${result.deletedPayment.method}) for ${result.member.fullName}.${revertNote} New status: ${result.member.paymentStatus}.`
    ).catch((e) => logger.error("Audit log failed on swim payment delete:", e));

    return NextResponse.json({
      success: true,
      member: result.member,
      upgradeReverted: result.upgradeReverted,
    });
  } catch (err: unknown) {
    logger.error("DELETE swim payment error:", err);
    return NextResponse.json({ error: "Failed to erase swim payment" }, { status: 500 });
  }
}
