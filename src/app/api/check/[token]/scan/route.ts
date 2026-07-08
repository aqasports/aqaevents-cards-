import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scanSchema = z.object({
  cardCode: z.string().min(1),
  sessionId: z.string().min(1),
});

// POST /api/check/[token]/scan
// Public: scan a card at a club terminal, record check-in
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // 1. Validate club token
    const club = await prisma.club.findUnique({
      where: { token },
      select: { id: true, name: true, active: true },
    });

    if (!club || !club.active) {
      return NextResponse.json({ error: "Invalid or inactive club" }, { status: 403 });
    }

    // 2. Validate request body
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { cardCode, sessionId } = parsed.data;

    // 3. Verify the session belongs to this club
    const session = await prisma.activitySession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        clubId: true,
        sessionDate: true,
        activity: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.clubId !== club.id) {
      return NextResponse.json({ error: "Session is not assigned to this club" }, { status: 403 });
    }

    // 4. Look up card by card code
    const card = await prisma.card.findUnique({
      where: { cardCode: cardCode.trim().toUpperCase() },
      select: {
        id: true,
        status: true,
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            ledgerEntries: {
              select: { delta: true },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({
        success: false,
        status: "not_found",
        message: "Card not found in the system",
      }, { status: 404 });
    }

    if (card.status === "voided") {
      return NextResponse.json({
        success: false,
        status: "voided",
        message: "This card has been voided",
      });
    }

    if (!card.client) {
      return NextResponse.json({
        success: false,
        status: "unassigned",
        message: "This card has not been assigned to a client yet",
      });
    }

    // 5. Calculate credit balance
    const balance = card.client.ledgerEntries.reduce((sum, e) => sum + e.delta, 0);

    // 6. Check if the client has a redemption for this session
    const redemption = await prisma.redemption.findFirst({
      where: {
        clientId: card.client.id,
        sessionId,
      },
    });

    if (!redemption) {
      return NextResponse.json({
        success: false,
        status: "not_redeemed",
        message: "This client has no redemption for this event",
        clientName: card.client.fullName,
        creditBalance: Math.round(balance * 100) / 100,
      });
    }

    // 7. Check if already checked in
    const existing = await prisma.clubCheckIn.findUnique({
      where: { sessionId_cardId: { sessionId, cardId: card.id } },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        status: "already_checked_in",
        message: "Already checked in",
        clientName: card.client.fullName,
        creditBalance: Math.round(balance * 100) / 100,
        checkedAt: existing.checkedAt,
      });
    }

    // 8. Create the check-in record
    const checkIn = await prisma.clubCheckIn.create({
      data: {
        clubId: club.id,
        sessionId,
        cardId: card.id,
        clientId: card.client.id,
      },
    });

    return NextResponse.json({
      success: true,
      status: "checked_in",
      message: "Check-in successful",
      clientName: card.client.fullName,
      creditBalance: Math.round(balance * 100) / 100,
      checkedAt: checkIn.checkedAt,
    });

  } catch (err) {
    console.error("POST check/scan error:", err);
    return NextResponse.json({ error: "Server error during scan" }, { status: 500 });
  }
}
