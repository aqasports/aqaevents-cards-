import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/sessions/[id]/checkins
// Admin: fetch all check-ins for a specific session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const checkIns = await prisma.checkIn.findMany({
      where: {
        sessionId: id,
        status: "SUCCESS",
      },
      select: {
        id: true,
        scannedAt: true,
        clientId: true,
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        club: { select: { id: true, name: true } },
      },
      orderBy: { scannedAt: "asc" },
    });

    // Match the format expected by the frontend:
    // { id, checkedAt: scannedAt, clientId, card: null, client, club }
    const enriched = checkIns.map((ci) => ({
      id: ci.id,
      checkedAt: ci.scannedAt,
      clientId: ci.clientId,
      card: null, // Card ID is not directly tracked on CheckIn but client is populated
      client: ci.client,
      club: ci.club,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET session checkins error:", err);
    return NextResponse.json({ error: "Failed to fetch check-ins" }, { status: 500 });
  }
}
