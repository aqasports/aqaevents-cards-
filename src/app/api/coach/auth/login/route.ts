import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import { verifyPassword, createCoachAuthSession } from "@/lib/coach-auth";
import { checkAndIncrement } from "@/lib/rate-limit";
import { getFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

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
        { status: 503 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid credentials format." },
        { status: 400 }
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
        { status: 429 }
      );
    }

    const account = await prisma.coachAccount.findUnique({
      where: { email },
      include: { coach: true },
    });

    if (!account || !account.loginEnabled || !account.coach.active) {
      // Timing safe delay
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
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
        { status: 401 }
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

    return NextResponse.json({
      accessToken: sessionTokens.accessToken,
      refreshToken: sessionTokens.refreshToken,
      expiresIn: sessionTokens.expiresIn,
      coach: {
        id: account.coach.id,
        name: account.coach.name,
        email: account.email,
        phone: account.coach.phone,
        role: account.role,
        categories: account.categories ? JSON.parse(account.categories) : null,
      },
    });
  } catch (err) {
    logger.error("Coach login error:", err);
    return NextResponse.json(
      { error: "Authentication service error. Please try again." },
      { status: 500 }
    );
  }
}
