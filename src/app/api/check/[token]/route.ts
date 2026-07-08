import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/check/[token]
// Public: resolves a club token and returns club info + today's active sessions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const club = await prisma.club.findUnique({
      where: { token },
      select: {
        id: true,
        name: true,
        contact: true,
        active: true,
        sessions: {
          where: { active: true },
          include: {
            activity: {
              select: { id: true, name: true, requiresCheck: true },
            },
            _count: {
              select: { redemptions: true, clubCheckIns: true },
            },
          },
          orderBy: { sessionDate: "asc" },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (!club.active) {
      return NextResponse.json({ error: "Club terminal is disabled" }, { status: 403 });
    }

    return NextResponse.json(club);
  } catch (err) {
    console.error("GET check token error:", err);
    return NextResponse.json({ error: "Failed to fetch club info" }, { status: 500 });
  }
}
