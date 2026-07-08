import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { BillingService } from "@/modules/invoices/service";
import { z } from "zod";

const billingService = new BillingService();

const checkInSchema = z.object({
  clientId: z.string().optional().nullable(),
  scannedValue: z.string().optional().nullable(),
  sessionId: z.string().min(1),
  bypassDuplicateCheck: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const { session: adminSession, error } = await requireAdminSession();
  if (error || !adminSession) return error;

  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input fields." }, { status: 400 });
    }

    const { clientId, scannedValue, sessionId, bypassDuplicateCheck } = parsed.data;

    // 1. Resolve client
    let resolvedClientId = clientId;

    if (scannedValue) {
      let token = scannedValue.trim();
      if (token.includes("/")) {
        token = token.substring(token.lastIndexOf("/") + 1);
      }

      const card = await prisma.card.findUnique({
        where: { publicToken: token },
        select: { clientId: true, status: true, client: { select: { archived: true } } },
      });

      if (!card || card.status !== "active" || !card.clientId || !card.client || card.client.archived) {
        return NextResponse.json({ error: "Card not recognized or inactive." }, { status: 404 });
      }
      resolvedClientId = card.clientId;
    }

    if (!resolvedClientId) {
      return NextResponse.json({ error: "Client could not be resolved." }, { status: 400 });
    }

    // 2. Load client details
    const client = await prisma.client.findUnique({
      where: { id: resolvedClientId },
      select: { id: true, fullName: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // 3. Load active session
    const session = await prisma.activitySession.findFirst({
      where: { id: sessionId, active: true },
      include: { activity: true },
    });

    if (!session || !session.activity || !session.activity.active) {
      return NextResponse.json({ error: "Active event session not found." }, { status: 404 });
    }

    const activity = session.activity;

    // 4. Check if client is already an attendee for this session
    const existingRedemption = await prisma.redemption.findFirst({
      where: {
        clientId: client.id,
        sessionId: session.id,
      },
    });

    if (existingRedemption && !bypassDuplicateCheck) {
      return NextResponse.json({
        status: "DUPLICATE",
        clientName: client.fullName,
        message: "Client is already registered in the list of attendees.",
      });
    }

    // 5. Create redemption (and deduct credit)
    const result = await billingService.createRedemption(
      client.id,
      activity.id,
      {
        sessionId: session.id,
        notes: bypassDuplicateCheck
          ? `Bypassed check-in duplicate for guest/friend at master terminal`
          : `Checked in at AQA master terminal`,
      },
      adminSession.user.id
    );

    return NextResponse.json({
      status: "SUCCESS",
      clientName: client.fullName,
      activityName: activity.name,
      redemption: result.redemption,
    });
  } catch (err: unknown) {
    console.error("POST master check-in error:", err);
    if (err instanceof Error) {
      if (err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "Insufficient client balance." }, { status: 400 });
      }
      if (err.message === "NO_AVAILABLE_EVENTS" || err.message === "SESSION_NOT_AVAILABLE") {
        return NextResponse.json({ error: "This event session is not open for registration." }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
