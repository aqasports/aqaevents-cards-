import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { getCreditRate } from "@/lib/settings";
import { verifyCaptcha } from "@/lib/captcha";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { limited } = await checkAndIncrement(`demands:${ip}`, { windowMs: 60_000, max: 15 });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { error: "Inscription non autorisée. Les inscriptions à tous les groupes sont actuellement fermées." },
    { status: 403, headers: corsHeaders }
  );
}
