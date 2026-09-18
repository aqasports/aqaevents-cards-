import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

import { formatSwimLeadNotes } from "@/lib/swim-lead-details";

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
    const resolvedName = (body.fullName || body.nom || body.payload?.nom || "").trim();
    const resolvedPhone = (body.phone || body.telephone || body.payload?.telephone || "").trim();
    const email = (body.email || body.payload?.email || "").trim() || null;
    const birthDate = body.birthDate || null;
    const category = body.category || body.payload?.category || "homme";
    const level = body.level || body.goal || body.payload?.goal || "beginner";
    const frequency = body.frequency || body.payload?.frequency || "1x";
    const formula = body.formula || body.formule || body.payload?.formule || "G10";
    const duration = body.duration || body.payload?.duration || "3m";
    const preferredDays = body.preferredDays || body.dayNight || body.payload?.timePref || null;

    // Structured metadata capture
    const rawArticles =
      body.articles ||
      body.payload?.articles ||
      (typeof body.equipmentPack === "string" && body.equipmentPack !== "Oui" ? body.equipmentPack.split(",") : []);
    const hasEquipment = Boolean(
      body.equipmentPack ||
        body.payload?.equipement ||
        (Array.isArray(rawArticles) && rawArticles.filter((a: string) => a !== "none").length > 0)
    );

    const formattedNotes = formatSwimLeadNotes({
      equipment: {
        hasPack: hasEquipment,
        articles: Array.isArray(rawArticles) ? rawArticles : [],
        rawText: typeof body.equipmentPack === "string" ? body.equipmentPack : null,
      },
      demographics: {
        city: body.city || body.ville || body.payload?.ville || null,
        age: body.age || body.payload?.age || null,
        whatsapp: body.whatsapp || body.payload?.whatsapp || null,
        channel: body.channel || body.payload?.channel || null,
        channelOther: body.channelOther || body.payload?.channelOther || null,
        goal: body.goal || body.payload?.goal || null,
        timePref: preferredDays,
        memberType: body.memberType || (body.personalId ? "old" : "new"),
        personalId: body.personalId || body.payload?.personalId || null,
        pool: body.pool || body.payload?.piscine || null,
      },
      userNotes: body.notes || body.payload?.notes || null,
    });

    const marketingConsent = body.marketingConsent;
    const utmSource = body.utmSource;
    const utmMedium = body.utmMedium;
    const utmCampaign = body.utmCampaign;

    if (!resolvedName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!resolvedPhone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const lead = await prisma.swimLead.create({
      data: {
        fullName: resolvedName,
        phone: resolvedPhone,
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
        notes: formattedNotes,
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
