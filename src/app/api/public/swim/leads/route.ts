import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`swim-leads:${ip}`, {
    windowMs: 60_000,
    max: 20,
  });

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      birthDate,
      category,
      level,
      frequency,
      formula,
      duration,
      preferredDays,
      notes,
      marketingConsent,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const lead = await prisma.swimLead.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        category: category || "homme",
        level: level || "beginner",
        frequency: frequency || "1x",
        formula: formula || "G10",
        duration: duration || "3m",
        preferredDays: preferredDays
          ? typeof preferredDays === "string"
            ? preferredDays
            : JSON.stringify(preferredDays)
          : null,
        notes: notes?.trim() || null,
        marketingConsent: Boolean(marketingConsent),
        utmSource: utmSource ? String(utmSource).trim() : null,
        utmMedium: utmMedium ? String(utmMedium).trim() : null,
        utmCampaign: utmCampaign ? String(utmCampaign).trim() : null,
        status: "pending",
      },
    });

    return NextResponse.json(
      { success: true, leadId: lead.id },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST public swim lead error:", err);
    return NextResponse.json(
      { error: "Failed to submit inscription lead" },
      { status: 500, headers: corsHeaders }
    );
  }
}
