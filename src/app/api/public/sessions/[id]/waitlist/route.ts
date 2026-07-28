import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { sendSimulatedNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`waitlist:${ip}`, { windowMs: 60_000, max: 10 });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  const { id: sessionId } = await params;

  try {
    const session = await prisma.activitySession.findUnique({
      where: { id: sessionId },
      include: { activity: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { phoneOrEmail, name } = body;

    const clean = phoneOrEmail ? String(phoneOrEmail).trim() : "";
    if (!clean) {
      return NextResponse.json(
        { error: "phoneOrEmail is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    let client = await prisma.client.findFirst({
      where: {
        OR: [{ phone: clean }, { email: clean }],
        archived: false,
      },
    });

    if (!client) {
      const isEmail = clean.includes("@");
      client = await prisma.client.create({
        data: {
          fullName: name ? String(name).trim() : (isEmail ? clean.split("@")[0] : clean),
          email: isEmail ? clean : null,
          phone: isEmail ? "+213555000000" : clean,
        },
      });
    }

    const existingWaitlist = await prisma.sessionWaitlist.findFirst({
      where: {
        sessionId,
        clientId: client.id,
        status: { in: ["waiting", "notified"] },
      },
    });

    if (existingWaitlist) {
      return NextResponse.json(
        {
          success: true,
          message: "Client is already on the waitlist for this session",
          waitlist: existingWaitlist,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const waitlist = await prisma.sessionWaitlist.create({
      data: {
        sessionId,
        clientId: client.id,
        status: "waiting",
      },
      include: {
        client: true,
      },
    });

    const recipient = client.email || client.phone || "";
    const type = client.email ? "EMAIL" : "SMS";
    const activityName = session.activity.name;

    await sendSimulatedNotification(
      client.id,
      type === "EMAIL" ? "email" : "sms",
      recipient,
      `You have joined the waitlist for ${activityName}. We will notify you when a spot opens up!`,
      "AQA Session Waitlist Confirmation"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Successfully joined session waitlist",
        waitlist,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST public session waitlist error:", err);
    return NextResponse.json(
      { error: "Failed to join session waitlist" },
      { status: 500, headers: corsHeaders }
    );
  }
}
