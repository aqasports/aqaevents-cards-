import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateSwimPrice } from "@/lib/swim-pricing";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/swim/groups/[id]/assign
 * Assign a swimmer to this group.
 * Body: { memberId: string, groupStatus?: "proposed" | "accepted" }
 *
 * DELETE /api/admin/swim/groups/[id]/assign?memberId=xxx
 * Remove a swimmer from this group.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: groupId } = await params;

  try {
    const body = await request.json();
    const { memberId, groupStatus = "proposed" } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Fetch member
    const member = await prisma.swimMember.findUnique({ where: { id: memberId } });

    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    // Fetch group
    const group = await prisma.swimGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { swimmers: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.active) {
      return NextResponse.json({ error: "Cannot assign to an archived group" }, { status: 400 });
    }

    // Validate category match
    if (group.category !== member.category) {
      return NextResponse.json(
        { error: `Group category (${group.category}) does not match swimmer category (${member.category})` },
        { status: 400 }
      );
    }

    // If already in this exact group, return early
    if (member.groupId === group.id) {
      return NextResponse.json(member);
    }

    // Check capacity only if swimmer is not already enrolled in this group
    if (group._count.swimmers >= group.capacity) {
      return NextResponse.json(
        { error: `Group is at full capacity (${group.capacity})` },
        { status: 409 }
      );
    }

    // Auto-calculate formula, duration, and tariff for the new group
    const duration = member.duration || "3m";
    const freqMatch = (member.formula || "").match(/^([123])x/i);
    const frequency = freqMatch ? parseInt(freqMatch[1], 10) : 1;
    const formula = frequency > 1 ? `${frequency}x ${group.level}` : group.level;
    const priceDA = calculateSwimPrice({
      category: member.category,
      groupType: group.level,
      duration,
      frequency,
    });

    // Determine paymentStatus based on existing payments vs new tariff
    const payments = await prisma.swimPayment.findMany({
      where: { memberId },
      select: { amount: true },
    });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    let paymentStatus = "unpaid";
    if (priceDA > 0 && totalPaid >= priceDA) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    }

    // Perform assignment with auto-calculated tariff and synced ledger status
    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        groupId: group.id,
        groupStatus: groupStatus === "accepted" ? "accepted" : "proposed",
        formula,
        duration,
        priceDA,
        paymentStatus,
      },
      include: {
        group: true,
        card: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    logger.error("POST assign swimmer to group error:", err);
    return NextResponse.json({ error: "Failed to assign swimmer to group" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: groupId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId query param is required" }, { status: 400 });
    }

    const member = await prisma.swimMember.findUnique({ where: { id: memberId } });

    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    if (member.groupId !== groupId) {
      return NextResponse.json(
        { error: "Swimmer is not assigned to this group" },
        { status: 400 }
      );
    }

    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        groupId: null,
        groupStatus: "proposed",
      },
      include: {
        group: true,
        card: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    logger.error("DELETE remove swimmer from group error:", err);
    return NextResponse.json({ error: "Failed to remove swimmer from group" }, { status: 500 });
  }
}
