import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decodeSolidNotes, encodeSolidNotes } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const group = await prisma.swimGroup.findUnique({
      where: { id },
      include: {
        swimmers: {
          include: {
            card: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Swim group not found" }, { status: 404 });
    }

    const { isSolid, cleanNotes } = decodeSolidNotes(group.notes);

    return NextResponse.json({
      ...group,
      isSolid,
      cleanNotes,
    });
  } catch (err: unknown) {
    logger.error("GET admin swim group detail error:", err);
    return NextResponse.json({ error: "Failed to fetch swim group" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, category, level, coachName, schedule, capacity, active, notes, isSolid } = body;

    let updatedNotes: string | null | undefined = undefined;
    if (isSolid !== undefined || notes !== undefined) {
      const existing = await prisma.swimGroup.findUnique({
        where: { id },
        select: { notes: true },
      });
      const currentDecoded = decodeSolidNotes(existing?.notes);
      const targetSolid = isSolid !== undefined ? Boolean(isSolid) : currentDecoded.isSolid;
      const targetNotes = notes !== undefined ? notes : currentDecoded.cleanNotes;
      updatedNotes = encodeSolidNotes(targetNotes, targetSolid);
    }

    const updated = await prisma.swimGroup.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
        ...(level && { level }),
        ...(coachName !== undefined && { coachName: coachName?.trim() || null }),
        ...(schedule !== undefined && { schedule: typeof schedule === "string" ? schedule : JSON.stringify(schedule) }),
        ...(capacity !== undefined && { capacity: parseInt(capacity, 10) }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(updatedNotes !== undefined && { notes: updatedNotes }),
      },
    });

    const { isSolid: decodedSolid, cleanNotes } = decodeSolidNotes(updated.notes);

    return NextResponse.json({
      ...updated,
      isSolid: decodedSolid,
      cleanNotes,
    });
  } catch (err: unknown) {
    logger.error("PATCH admin swim group error:", err);
    return NextResponse.json({ error: "Failed to update swim group" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const memberCount = await prisma.swimMember.count({
      where: { groupId: id },
    });

    if (memberCount > 0) {
      // Soft-archive if has members
      await prisma.swimGroup.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ success: true, archived: true });
    }

    await prisma.swimGroup.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (err: unknown) {
    logger.error("DELETE admin swim group error:", err);
    return NextResponse.json({ error: "Failed to delete swim group" }, { status: 500 });
  }
}
