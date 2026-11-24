import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { formatSwimLeadNotes } from "@/lib/swim-lead-details";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const optionalTrimmedString = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

const formationLeadSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((val) => val.replace(/\D/g, "").length >= 8, {
      message: "Valid phone number is required",
    }),
  whatsapp: optionalTrimmedString(30),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Invalid email address",
    }),
  age: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return null;
      const num = typeof val === "number" ? val : Number(String(val).trim());
      return Number.isFinite(num) ? Math.trunc(num) : NaN;
    }, z.number().int().min(12).max(85).nullable())
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  city: optionalTrimmedString(100),
  formationSlug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "chasse-sous-marine")),
  formationTitle: z
    .string()
    .trim()
    .max(140)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "Formation Chasse Sous-marine")),
  swimLevel: optionalTrimmedString(60),
  apneaExperience: optionalTrimmedString(60),
  spearfishingExperience: optionalTrimmedString(60),
  hasGear: optionalTrimmedString(60),
  preferredSchedule: optionalTrimmedString(80),
  channel: optionalTrimmedString(80),
  channelOther: optionalTrimmedString(120),
  notes: optionalTrimmedString(1500),
  lang: z.enum(["fr", "en", "ar"]).optional().default("fr"),
  marketingConsent: z.boolean().optional().default(false),
  utmSource: optionalTrimmedString(120),
  utmMedium: optionalTrimmedString(120),
  utmCampaign: optionalTrimmedString(120),
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const { limited } = await checkAndIncrement(`public-formations-leads:${ip}`, {
    windowMs: 60_000,
    max: 20,
  });

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400, headers: corsHeaders }
    );
  }

  const parsed = formationLeadSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message || "Invalid formation inscription data",
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400, headers: corsHeaders }
    );
  }

  const data = parsed.data;

  try {
    const formattedNotes = formatSwimLeadNotes({
      demographics: {
        city: data.city,
        age: data.age,
        whatsapp: data.whatsapp,
        channel: data.channel,
        channelOther: data.channelOther,
        timePref: data.preferredSchedule,
        memberType: "new",
      },
      formation: {
        slug: data.formationSlug,
        title: data.formationTitle,
        swimLevel: data.swimLevel,
        apneaExperience: data.apneaExperience,
        spearfishingExperience: data.spearfishingExperience,
        hasGear: data.hasGear,
        preferredSchedule: data.preferredSchedule,
        lang: data.lang,
      },
      userNotes: data.notes,
    });

    const lead = await prisma.swimLead.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        category: "formation",
        level: data.spearfishingExperience || "debutant",
        frequency: "formation",
        formula: data.formationTitle,
        duration: data.formationSlug,
        preferredDays: data.preferredSchedule || null,
        notes: formattedNotes,
        marketingConsent: data.marketingConsent,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        status: "pending",
      },
    });

    return NextResponse.json(
      { success: true, leadId: lead.id },
      { status: 201, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST /api/public/formations/leads error:", err);
    return NextResponse.json(
      { error: "Failed to submit formation lead" },
      { status: 500, headers: corsHeaders }
    );
  }
}
