import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import { verifyPassword, hashPassword, createCoachAuthSession } from "@/lib/coach-auth";
import { checkAndIncrement } from "@/lib/rate-limit";
import { getFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  platform: z.string().optional(),
  deviceLabel: z.string().optional(),
  appVersion: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Feature flag check
    const isEnabled = await getFlag("coach_app_enabled", true);
    if (!isEnabled) {
      return NextResponse.json(
        { error: "AQA Coaches service is currently unavailable." },
        { status: 503, headers: corsHeaders }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid credentials format." },
        { status: 400, headers: corsHeaders }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    // IP rate limit: 10 attempts per 15 minutes
    const rateLimit = await checkAndIncrement(`coach_login:${ip}`, {
      windowMs: 15 * 60 * 1000,
      max: 10,
    });
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 15 minutes." },
        { status: 429, headers: corsHeaders }
      );
    }

    let account = await prisma.coachAccount.findUnique({
      where: { email },
      include: { coach: true },
    });

    // Auto-provision store review / demo accounts if they don't exist yet
    const DEMO_ACCOUNTS: Record<string, { role: "head_coach" | "coach" | "assistant"; name: string }> = {
      "headcoach@aqasports.pro": { role: "head_coach", name: "Head Coach" },
      "coach@aqasports.pro": { role: "coach", name: "Coach" },
      "assistant@aqasports.pro": { role: "assistant", name: "Assistant Coach" },
    };

    if (!account && DEMO_ACCOUNTS[email] && parsed.data.password === "AqaDemo2026!") {
      let demoCoach = await prisma.coach.findFirst({
        where: { name: DEMO_ACCOUNTS[email].name },
      });
      if (!demoCoach) {
        demoCoach = await prisma.coach.create({
          data: {
            name: DEMO_ACCOUNTS[email].name,
            phone: "+213550000000",
            specialties: JSON.stringify(["natation_enfants", "natation_adultes"]),
            active: true,
          },
        });
      }
      const hash = await hashPassword("AqaDemo2026!");
      account = await prisma.coachAccount.create({
        data: {
          coachId: demoCoach.id,
          email,
          passwordHash: hash,
          role: DEMO_ACCOUNTS[email].role,
          loginEnabled: true,
        },
        include: { coach: true },
      });
    }

    if (!account || !account.loginEnabled || !account.coach.active) {
      // Timing safe delay
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401, headers: corsHeaders }
      );
    }

    const passwordValid = await verifyPassword(parsed.data.password, account.passwordHash);
    if (!passwordValid) {
      await logAdminAction(
        null,
        "COACH_LOGIN_FAILED",
        email,
        JSON.stringify({ ip, reason: "incorrect_password" })
      );
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401, headers: corsHeaders }
      );
    }

    // Update lastLoginAt
    await prisma.coachAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionTokens = await createCoachAuthSession({
      accountId: account.id,
      coachId: account.coachId,
      role: account.role as "head_coach" | "coach" | "assistant",
      email: account.email,
      name: account.coach.name,
      platform: parsed.data.platform,
      deviceLabel: parsed.data.deviceLabel,
      appVersion: parsed.data.appVersion,
    });

    await logAdminAction(
      null,
      "COACH_LOGIN_SUCCESS",
      email,
      JSON.stringify({ ip, role: account.role, coachId: account.coachId })
    );

    return NextResponse.json(
      {
        token: sessionTokens.accessToken,
        refreshToken: sessionTokens.refreshToken,
        expiresIn: sessionTokens.expiresIn,
        coach: {
          id: account.id,
          coachId: account.coach.id,
          name: account.coach.name,
          email: account.email,
          phone: account.coach.phone,
          role: account.role,
          specialties: account.coach.specialties ? JSON.parse(account.coach.specialties) : [],
          status: account.coach.active ? "ACTIVE" : "INACTIVE",
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("Coach login error:", err);
    return NextResponse.json(
      { error: "Authentication service error. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
