import { NextRequest, NextResponse } from "next/server";
import { generateMagicPin } from "@/lib/client-auth";
import { checkAndIncrement } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`magic_link:${ip}`, { windowMs: 60_000, max: 10 });
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { phoneOrEmail } = body;

    if (!phoneOrEmail || !String(phoneOrEmail).trim()) {
      return NextResponse.json(
        { error: "phoneOrEmail is required" },
        { status: 400 }
      );
    }

    await generateMagicPin(String(phoneOrEmail));

    return NextResponse.json({
      success: true,
      message: "If an account exists, a verification PIN has been sent via SMS/Email.",
    });
  } catch (err: unknown) {
    logger.error("POST magic-link error:", err);
    return NextResponse.json(
      { error: "Failed to generate verification PIN" },
      { status: 500 }
    );
  }
}
