import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Inscription non autorisée. Les inscriptions sont actuellement fermées." },
    { status: 403 }
  );
}
