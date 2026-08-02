/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { sendSimulatedNotification } from "./notifications";

const MAGIC_PIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function generateMagicPin(phoneOrEmail: string): Promise<{ pin: string | null; client: any }> {
  const clean = phoneOrEmail.trim();
  if (!clean) return { pin: null, client: null };

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { phone: clean },
        { email: clean },
      ],
      archived: false,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      archived: true,
    },
  });

  if (!client) {
    return { pin: null, client: null };
  }

  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `magic_pin:${client.id}`;
  const now = new Date();
  const lockUntil = new Date(now.getTime() + MAGIC_PIN_WINDOW_MS);

  await prisma.rateLimitBucket.upsert({
    where: { key },
    create: {
      key,
      count: parseInt(pin, 10),
      windowStart: now,
      lockUntil,
    },
    update: {
      count: parseInt(pin, 10),
      windowStart: now,
      lockUntil,
    },
  });

  // Send notification to client
  const recipient = client.email || client.phone || "";
  const type = client.email ? "EMAIL" : "SMS";
  const message = `Your AQA Events portal verification code is ${pin}. Valid for 15 minutes.`;

  await sendSimulatedNotification(
    client.id,
    type === "EMAIL" ? "email" : "sms",
    recipient,
    message,
    "AQA Events Verification Code"
  );

  return { pin, client };
}

export async function verifyMagicPin(
  phoneOrEmail: string,
  pin: string
): Promise<{ success: boolean; client?: any; token?: string; error?: string }> {
  const clean = phoneOrEmail.trim();
  const cleanPin = pin.trim();

  if (!clean || !cleanPin) {
    return { success: false, error: "Identifier and PIN are required" };
  }

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { phone: clean },
        { email: clean },
      ],
      archived: false,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      archived: true,
    },
  });

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const key = `magic_pin:${client.id}`;
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!bucket || !bucket.lockUntil || new Date() > bucket.lockUntil) {
    return { success: false, error: "PIN_EXPIRED_OR_INVALID" };
  }

  if (bucket.count !== parseInt(cleanPin, 10)) {
    return { success: false, error: "INVALID_PIN" };
  }

  // Delete pin after successful verification
  try {
    await prisma.rateLimitBucket.delete({ where: { key } });
  } catch {
    // ignore if already deleted
  }

  const token = `cli_${client.id}_${Date.now()}`;

  return {
    success: true,
    client,
    token,
  };
}

export async function requireClientSession(request: NextRequest): Promise<{ client: any; error: NextResponse | null }> {
  const authHeader = request.headers.get("authorization");
  const tokenCookie = request.cookies.get("client_token")?.value;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : tokenCookie;

  if (!token || !token.startsWith("cli_")) {
    return {
      client: null,
      error: NextResponse.json({ error: "Unauthorized: Missing or invalid client token" }, { status: 401 }),
    };
  }

  const parts = token.split("_");
  const clientId = parts[1];

  if (!clientId) {
    return {
      client: null,
      error: NextResponse.json({ error: "Unauthorized: Invalid token format" }, { status: 401 }),
    };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      archived: true,
      organization: {
        select: { id: true, name: true, useSharedPool: true },
      },
      cards: {
        select: { id: true, cardCode: true, publicToken: true, status: true },
      },
    },
  });

  if (!client || client.archived) {
    return {
      client: null,
      error: NextResponse.json({ error: "Unauthorized: Client account not found" }, { status: 401 }),
    };
  }

  return { client, error: null };
}
