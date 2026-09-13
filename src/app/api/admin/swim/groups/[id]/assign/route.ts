import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

    // Check capacity
    if (group._count.swimmers >= group.capacity) {
      return NextResponse.json(
        { error: `Group is at full capacity (${group.capacity})` },
        { status: 409 }
      );
    }

    // Fetch member
    const member = await prisma.swimMember.findUnique({ where: { id: memberId } });

    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    // Validate category match
    if (group.category !== member.category) {
      return NextResponse.json(
        { error: `Group category (${group.category}) does not match swimmer category (${member.category})` },
        { status: 400 }
      );
    }

    // Perform assignment
    const updated = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        groupId: group.id,
        groupStatus: groupStatus === "accepted" ? "accepted" : "proposed",
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
