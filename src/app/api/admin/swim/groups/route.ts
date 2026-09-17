import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decodeSolidNotes, encodeSolidNotes, decodeMemberGroupIds } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const activeParam = searchParams.get("active");

  try {
    const where: Record<string, unknown> = {};

    if (category && category !== "all") {
      where.category = category;
    }

    if (activeParam === "true") {
      where.active = true;
    } else if (activeParam === "false") {
      where.active = false;
    }
    // If activeParam is null/missing, return all groups (no active filter)

    const groups = await prisma.swimGroup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { swimmers: true },
        },
      },
    });

    // Account for secondary multi-group assignments stored in notes
    const multiGroupMembers = await prisma.swimMember.findMany({
      where: { notes: { contains: "[GROUPS:" } },
      select: { id: true, groupId: true, notes: true },
    });

    const extraCounts: Record<string, number> = {};
    for (const m of multiGroupMembers) {
      const gids = decodeMemberGroupIds(m.notes, m.groupId);
      for (const gid of gids) {
        if (gid !== m.groupId) {
          extraCounts[gid] = (extraCounts[gid] || 0) + 1;
        }
      }
    }

    const enriched = groups.map((g) => {
      const { isSolid, cleanNotes } = decodeSolidNotes(g.notes);
      const secondaryCount = extraCounts[g.id] || 0;
      return {
        ...g,
        isSolid,
        cleanNotes,
        _count: {
          swimmers: (g._count?.swimmers ?? 0) + secondaryCount,
        },
      };
    });

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    logger.error("GET admin swim groups error:", err);
    return NextResponse.json({ error: "Failed to fetch swim groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { name, category, level, coachName, schedule, capacity, notes, isSolid } = body;

    if (!name || !level) {
      return NextResponse.json({ error: "Group name and type are required" }, { status: 400 });
    }

    const encodedNotes = encodeSolidNotes(notes, Boolean(isSolid));

    const group = await prisma.swimGroup.create({
      data: {
        name: name.trim(),
        category: category || "homme",
        level: level.trim(),
        coachName: coachName?.trim() || null,
        schedule: typeof schedule === "string" ? schedule : JSON.stringify(schedule || []),
        capacity: capacity ? parseInt(capacity, 10) : 10,
        notes: encodedNotes,
        active: true,
      },
    });

    const { isSolid: decodedSolid, cleanNotes } = decodeSolidNotes(group.notes);

    return NextResponse.json(
      {
        ...group,
        isSolid: decodedSolid,
        cleanNotes,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    logger.error("POST admin swim group error:", err);
    return NextResponse.json({ error: "Failed to create swim group" }, { status: 500 });
  }
}
