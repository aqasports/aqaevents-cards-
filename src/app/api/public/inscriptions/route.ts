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

function normalizeCategory(cat?: string | null): string {
  if (!cat) return "homme";
  const lower = cat.toLowerCase().trim();
  if (lower === "men" || lower === "homme") return "homme";
  if (lower === "women" || lower === "femme") return "femme";
  if (lower === "kids" || lower === "enfants") return "enfants";
  if (lower === "apnea" || lower === "apnee") return "apnea";
  return lower;
}

function normalizeFrequency(freq?: string | number | null): string {
  if (!freq) return "1x";
  const str = String(freq).trim();
  if (str.endsWith("x") || str.endsWith("X")) return str.toLowerCase();
  return `${str}x`;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`public-inscriptions:${ip}`, {
    windowMs: 60_000,
    max: 30,
  });

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();

    const memberType = body.memberType || (body.personalId ? "old" : "new");
    const isNew = memberType === "new";

    let fullName = (body.fullName || body.nom || body.payload?.nom || "").trim();
    let phone = (body.phone || body.telephone || body.payload?.telephone || "").trim();
    const email = (body.email || body.payload?.email || "").trim() || null;
    const rawCategory = body.category || body.payload?.category;
    const category = normalizeCategory(rawCategory);
    const frequency = normalizeFrequency(body.frequency || body.payload?.frequency);
    const formula = (body.formule || body.formula || body.payload?.formule || "G10").toUpperCase();
    const duration = (body.duration || body.payload?.duration || "3m").toLowerCase();
    const level = body.level || body.goal || body.payload?.goal || "beginner";

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
        city: body.city || body.payload?.ville || null,
        age: body.age || body.payload?.age || null,
        whatsapp: body.whatsapp || body.payload?.whatsapp || null,
        channel: body.channel || body.payload?.channel || null,
        channelOther: body.channelOther || body.payload?.channelOther || null,
        goal: body.goal || body.payload?.goal || null,
        timePref: body.dayNight || body.payload?.timePref || null,
        memberType: !isNew ? "old" : "new",
        personalId: body.personalId || body.payload?.personalId || null,
        pool: body.pool || body.payload?.piscine || null,
      },
      userNotes: body.notes || body.payload?.notes || null,
    });

    if (!isNew && body.personalId) {
      // If fullName or phone are missing for old member, try to look up SwimMember
      if (!fullName || !phone) {
        const existingMember = await prisma.swimMember.findUnique({
          where: { swimId: String(body.personalId).trim().toUpperCase() },
        });
        if (existingMember) {
          if (!fullName) fullName = existingMember.fullName;
          if (!phone) phone = existingMember.phone;
        }
      }
    }

    if (!fullName) {
      fullName = isNew ? "Nouveau Client Inscription" : `Ancien Adherent ${body.personalId || ""}`.trim();
    }

    if (!phone) {
      phone = "0000000000";
    }

    const lead = await prisma.swimLead.create({
      data: {
        fullName,
        phone,
        email,
        category,
        level,
        frequency,
        formula,
        duration,
        preferredDays: body.dayNight || body.payload?.timePref || null,
        notes: formattedNotes,
        marketingConsent: Boolean(body.marketingConsent),
        utmSource: body.utmSource ? String(body.utmSource).trim() : null,
        utmMedium: body.utmMedium ? String(body.utmMedium).trim() : null,
        utmCampaign: body.utmCampaign ? String(body.utmCampaign).trim() : null,
        status: "pending",
      },
    });

    return NextResponse.json(
      { success: true, leadId: lead.id, paymentUrl: null },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST /api/public/inscriptions error:", err);
    return NextResponse.json(
      { error: "Failed to submit inscription lead" },
      { status: 500, headers: corsHeaders }
    );
  }
}
