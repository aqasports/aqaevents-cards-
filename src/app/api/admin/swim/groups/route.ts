import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const groups = await prisma.swimGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { swimmers: true },
        },
      },
    });
    return NextResponse.json(groups);
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
    const { name, category, level, coachName, schedule, capacity, notes } = body;

    if (!name || !level) {
      return NextResponse.json({ error: "Group name and level are required" }, { status: 400 });
    }

    const group = await prisma.swimGroup.create({
      data: {
        name: name.trim(),
        category: category || "homme",
        level: level.trim(),
        coachName: coachName?.trim() || null,
        schedule: typeof schedule === "string" ? schedule : JSON.stringify(schedule || []),
        capacity: capacity ? parseInt(capacity, 10) : 20,
        notes: notes?.trim() || null,
        active: true,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST admin swim group error:", err);
    return NextResponse.json({ error: "Failed to create swim group" }, { status: 500 });
  }
}
