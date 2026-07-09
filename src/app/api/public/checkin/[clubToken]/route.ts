import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getClientBalance } from "@/lib/balance";

const checkInSchema = z.object({
  scannedValue: z.string().min(1),
  activityId: z.string().min(1),
  sessionId: z.string().optional().nullable(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 120;
}

function getFirstNameWithInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last.charAt(0)}.`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubToken: string }> }
) {
  const { clubToken } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `${clubToken}:${ip}`;

  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const club = await prisma.club.findUnique({
      where: { terminalToken: clubToken },
      select: {
        id: true,
        name: true,
        isActive: true,
        logoUrl: true,
      },
    });

    if (!club || !club.isActive) {
      return NextResponse.json({ error: "Terminal not found or inactive" }, { status: 404 });
    }

    // Fetch all active sessions hosted/checked by this club
    const sessions = await prisma.activitySession.findMany({
      where: {
        clubId: club.id,
        active: true,
      },
      include: {
        activity: true,
      },
      orderBy: { sessionDate: "asc" },
    });

    // Group sessions by activity
    const activityMap = new Map<string, { id: string; name: string; sessions: any[] }>();
    for (const session of sessions) {
      const act = session.activity;
      if (!act.active) continue;
      if (!activityMap.has(act.id)) {
        activityMap.set(act.id, {
          id: act.id,
          name: act.name,
          sessions: [],
        });
      }
      activityMap.get(act.id)!.sessions.push({
        id: session.id,
        date: session.sessionDate.toISOString().split("T")[0],
        location: session.location,
      });
    }

    const activitiesList = Array.from(activityMap.values());

    // Fetch today's SUCCESS check-ins for the roster
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        clubId: club.id,
        scannedAt: { gte: todayStart },
        status: "SUCCESS",
      },
      include: {
        client: { select: { fullName: true } },
      },
      orderBy: { scannedAt: "desc" },
    });

    const roster = checkIns.map((ci) => ({
      clientName: getFirstNameWithInitial(ci.client.fullName),
      checkedInAt: ci.scannedAt.toISOString(),
      activityId: ci.activityId,
      sessionId: ci.sessionId,
    }));

    return NextResponse.json({
      club: { name: club.name, logoUrl: club.logoUrl },
      activities: activitiesList.map((act) => ({
        ...act,
        roster: roster.filter((r) => r.activityId === act.id),
      })),
    });
  } catch (err) {
    console.error("GET public check-in info error:", err);
    return NextResponse.json({ error: "Failed to fetch terminal info" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubToken: string }> }
) {
  const { clubToken } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `${clubToken}:${ip}`;

  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    // 1. Resolve club
    const club = await prisma.club.findUnique({
      where: { terminalToken: clubToken },
      select: { id: true, isActive: true },
    });

    if (!club || !club.isActive) {
      return NextResponse.json({ status: "INVALID_CARD", message: "Terminal is inactive or not found." }, { status: 404 });
    }

    // 2. Validate body
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { scannedValue, activityId, sessionId } = parsed.data;

    // 3. Resolve card token
    let token = scannedValue.trim();
    if (token.includes("/")) {
      token = token.substring(token.lastIndexOf("/") + 1);
    }

    // 4. Look up client via card/token
    const card = await prisma.card.findUnique({
      where: { publicToken: token },
      include: {
        client: {
          include: {
            ledgerEntries: { select: { delta: true } },
          },
        },
      },
    });

    if (!card || card.status !== "active" || !card.client || card.client.archived) {
      return NextResponse.json({ status: "INVALID_CARD", message: "Card not recognized." });
    }

    // 5. Confirm activity session exists, is active, and belongs to this club
    if (!sessionId) {
      return NextResponse.json({ status: "INVALID_CARD", message: "Session is required for check-in." });
    }

    const session = await prisma.activitySession.findFirst({
      where: {
        id: sessionId,
        clubId: club.id,
        active: true,
        activityId,
      },
      include: {
        activity: true,
      },
    });

    if (!session || !session.activity || !session.activity.active) {
      return NextResponse.json({ status: "INVALID_CARD", message: "Session not recognized or not active at this club." });
    }

    const activity = session.activity;

    // 6. Query most recent matching Redemption
    const redemption = await prisma.redemption.findFirst({
      where: {
        clientId: card.client.id,
        activityId: activity.id,
        // Accept a redemption tagged with this exact session, OR one redeemed
        // without a session (sessionId is optional in /admin/redeem) - otherwise
        // legitimately redeemed clients get rejected just because staff didn't
        // pick a session at redemption time.
        ...(sessionId ? { OR: [{ sessionId }, { sessionId: null }] } : {}),
      },
      orderBy: { redeemedAt: "desc" },
    });

    if (!redemption) {
      const balance = await getClientBalance(card.client.id);
      const totalCredits = card.client.ledgerEntries
        .filter((e) => e.delta > 0)
        .reduce((sum, item) => sum + item.delta, 0);

      return NextResponse.json({
        status: "NOT_REDEEMED",
        client: {
          name: getFirstNameWithInitial(card.client.fullName),
          fullName: card.client.fullName,
          cardCode: card.cardCode,
          balance,
          totalCredits: totalCredits > 0 ? totalCredits : (balance > 0 ? balance : 1),
          publicToken: card.publicToken,
        },
        message: "This card hasn't redeemed this activity.",
      });
    }

    // 7. Check for duplicate SUCCESS check-in
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        redemptionId: redemption.id,
        status: "SUCCESS",
      },
      select: { scannedAt: true },
    });

    if (existingCheckIn) {
      const balance = await getClientBalance(card.client.id);
      const totalCredits = card.client.ledgerEntries
        .filter((e) => e.delta > 0)
        .reduce((sum, item) => sum + item.delta, 0);

      return NextResponse.json({
        status: "DUPLICATE",
        client: {
          name: getFirstNameWithInitial(card.client.fullName),
          fullName: card.client.fullName,
          cardCode: card.cardCode,
          balance,
          totalCredits: totalCredits > 0 ? totalCredits : (balance > 0 ? balance : 1),
          publicToken: card.publicToken,
        },
        originalCheckedInAt: existingCheckIn.scannedAt.toISOString(),
      });
    }

    // 8. Create CheckIn row
    const scannedIp = ip !== "unknown" ? ip : null;
    const checkIn = await prisma.checkIn.create({
      data: {
        clientId: card.client.id,
        activityId: activity.id,
        sessionId: sessionId || null,
        clubId: club.id,
        redemptionId: redemption.id,
        status: "SUCCESS",
        scannedIp,
      },
    });

    const balance = await getClientBalance(card.client.id);
    const totalCredits = card.client.ledgerEntries
      .filter((e) => e.delta > 0)
      .reduce((sum, item) => sum + item.delta, 0);

    return NextResponse.json({
      status: "SUCCESS",
      client: {
        name: getFirstNameWithInitial(card.client.fullName),
        fullName: card.client.fullName,
        cardCode: card.cardCode,
        balance,
        totalCredits: totalCredits > 0 ? totalCredits : (balance > 0 ? balance : 1),
        publicToken: card.publicToken,
      },
      activity: { name: activity.name },
      checkedInAt: checkIn.scannedAt.toISOString(),
    });
  } catch (err) {
    console.error("POST public check-in error:", err);
    return NextResponse.json({ error: "Server error during check-in" }, { status: 500 });
  }
}
