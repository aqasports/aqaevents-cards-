import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateSwimPrice, resolveMultiGroupFormula } from "@/lib/swim-pricing";
import { decodeMemberGroupIds, encodeMemberGroupIds } from "@/lib/swim-groups";

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

    const currentGroupIds = decodeMemberGroupIds(member.notes, member.groupId);

    // If already in this exact group, ensure notes and groupId are synced and return
    if (member.groupId === group.id || currentGroupIds.includes(group.id)) {
      const syncedIds = currentGroupIds.includes(group.id) ? currentGroupIds : [group.id];
      const syncedNotes = encodeMemberGroupIds(member.notes, syncedIds);
      if (member.notes !== syncedNotes || member.groupId !== syncedIds[0]) {
        const synced = await prisma.swimMember.update({
          where: { id: memberId },
          data: {
            groupId: syncedIds[0],
            notes: syncedNotes,
          },
          include: {
            group: true,
            card: true,
            payments: { orderBy: { paidAt: "desc" } },
          },
        });
        return NextResponse.json(synced);
      }
      return NextResponse.json(member);
    }

    // Count both primary and valid secondary multi-group swimmers in this group
    const secondaryCandidates = await prisma.swimMember.findMany({
      where: {
        groupId: { not: null },
        notes: { contains: "[GROUPS:" },
      },
      select: { id: true, groupId: true, notes: true },
    });
    const secondaryCount = secondaryCandidates.filter(
      (m) =>
        m.groupId !== group.id &&
        decodeMemberGroupIds(m.notes, m.groupId).includes(group.id)
    ).length;
    const totalEnrolled = (group._count?.swimmers ?? 0) + secondaryCount;

    if (totalEnrolled >= group.capacity) {
      return NextResponse.json(
        { error: `Group is at full capacity (${group.capacity})` },
        { status: 409 }
      );
    }

    // Determine whether this is a multi-group addition or a single-group assignment/transfer
    const duration = member.duration || "3m";
    const freqMatch = (member.formula || "").match(/^([123])x/i);
    const frequency = freqMatch ? parseInt(freqMatch[1], 10) : 1;

    let nextGroupIds: string[];
    if (frequency > 1 && currentGroupIds.length > 0 && currentGroupIds.length < frequency) {
      nextGroupIds = Array.from(new Set([...currentGroupIds, group.id]));
    } else {
      nextGroupIds = [group.id];
    }

    let formula = group.level;
    let priceDA = 0;

    if (nextGroupIds.length > 1) {
      const assignedGroups = await prisma.swimGroup.findMany({
        where: { id: { in: nextGroupIds } },
        select: { id: true, level: true },
      });
      const levelById = new Map(assignedGroups.map((g) => [g.id, g.level]));
      const groupLevels = nextGroupIds.map((gid) => levelById.get(gid) || group.level);
      const resolved = resolveMultiGroupFormula(groupLevels);
      formula = resolved.formula;
      priceDA = calculateSwimPrice({
        category: member.category,
        groupTypes: groupLevels,
        duration,
      });
    } else {
      formula = frequency > 1 ? `${frequency}x ${group.level}` : group.level;
      priceDA = calculateSwimPrice({
        category: member.category,
        groupType: group.level,
        duration,
        frequency,
      });
    }

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

    const updatedNotes = encodeMemberGroupIds(member.notes, nextGroupIds);

    // Perform assignment with synced groupId, [GROUPS:...] notes, tariff, and payment status
    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        groupId: nextGroupIds[0],
        groupStatus: groupStatus === "accepted" ? "accepted" : "proposed",
        formula,
        duration,
        priceDA,
        paymentStatus,
        notes: updatedNotes,
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

    const currentGroupIds = decodeMemberGroupIds(member.notes, member.groupId);
    const rawNotesGroupIds = decodeMemberGroupIds(member.notes);
    const isAssignedToThisGroup =
      member.groupId === groupId ||
      currentGroupIds.includes(groupId) ||
      rawNotesGroupIds.includes(groupId);

    if (!isAssignedToThisGroup) {
      return NextResponse.json(
        { error: "Swimmer is not assigned to this group" },
        { status: 400 }
      );
    }

    const remainingGroupIds = currentGroupIds.filter((id) => id !== groupId);
    const nextPrimaryGroupId = remainingGroupIds[0] ?? null;
    const cleanedNotes = encodeMemberGroupIds(member.notes, remainingGroupIds);

    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        groupId: nextPrimaryGroupId,
        groupStatus: "proposed",
        notes: cleanedNotes,
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
