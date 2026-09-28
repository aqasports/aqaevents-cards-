import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

import { formatSwimLeadNotes } from "@/lib/swim-lead-details";
import { calculateSwimPrice, resolveMultiGroupFormula } from "@/lib/swim-pricing";

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

function normalizeDuration(dur?: string | null, tierOrFormule?: string | null): string {
  const raw = (dur || tierOrFormule || "3m").toLowerCase().trim();
  if (raw === "1m" || raw.includes("starter")) return "1m";
  if (raw === "3m" || raw.includes("silver") || raw.includes("decouverte")) return "3m";
  if (raw === "6m" || raw.includes("gold") || raw.includes("recommand")) return "6m";
  if (raw === "9m" || raw.includes("diamond") || raw.includes("econom")) return "9m";
  return "3m";
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
    let category = normalizeCategory(rawCategory);
    let frequency = normalizeFrequency(body.frequency || body.payload?.frequency);
    const rawFormule = body.formule || body.formula || body.payload?.formule || "G10";
    let formula = String(rawFormule).trim();
    const duration = normalizeDuration(
      body.duration || body.payload?.duration,
      body.tier || body.payload?.formule || rawFormule
    );
    const level = !isNew
      ? "old_aqa"
      : body.level || body.goal || body.payload?.goal || "new_aqa";

    const rawPersonalId = String(
      body.personalId || body.payload?.personalId || ""
    ).trim();
    let resolvedPersonalId = rawPersonalId || null;
    let resolvedMemberId: string | null = body.memberId
      ? String(body.memberId).trim()
      : null;

    if (!isNew && (resolvedMemberId || rawPersonalId)) {
      const cleanUpper = rawPersonalId.toUpperCase();
      const existingMember = resolvedMemberId
        ? await prisma.swimMember.findUnique({ where: { id: resolvedMemberId } })
        : await prisma.swimMember.findFirst({
            where: {
              OR: [
                { swimId: { equals: cleanUpper, mode: "insensitive" } },
                ...(cleanUpper.length >= 4
                  ? [{ swimId: { endsWith: cleanUpper, mode: "insensitive" as const } }]
                  : []),
              ],
            },
          });

      if (existingMember) {
        resolvedMemberId = existingMember.id;
        resolvedPersonalId = existingMember.swimId;
        if (!fullName) fullName = existingMember.fullName;
        if (!phone) phone = existingMember.phone;
        if (!rawCategory && existingMember.category) {
          category = normalizeCategory(existingMember.category);
        }
      }
    }

    // Resolve selected groups if provided (Old Member group selection flow)
    const rawGroupIds =
      body.selectedGroupIds ||
      body.groupIds ||
      body.payload?.selectedGroupIds ||
      body.payload?.groupIds ||
      [];
    const selectedGroupIds: string[] = Array.isArray(rawGroupIds)
      ? Array.from(
          new Set(rawGroupIds.map((id: unknown) => String(id).trim()).filter(Boolean))
        )
      : [];

    let selectedGroupNames: string[] = Array.isArray(body.selectedGroupNames)
      ? body.selectedGroupNames.map((n: unknown) => String(n).trim()).filter(Boolean)
      : [];
    let resolvedPriceDA: number | null =
      typeof body.priceDA === "number"
        ? body.priceDA
        : body.priceDA
        ? parseInt(String(body.priceDA), 10) || null
        : null;

    if (selectedGroupIds.length > 0) {
      const dbGroups = await prisma.swimGroup.findMany({
        where: { id: { in: selectedGroupIds } },
      });

      // Preserve the client's selection order
      const orderedGroups = selectedGroupIds
        .map((id) => dbGroups.find((g) => g.id === id))
        .filter((g): g is NonNullable<typeof g> => Boolean(g));

      if (orderedGroups.length > 0) {
        selectedGroupNames = orderedGroups.map((g) => {
          const sched = g.schedule || g.name;
          const coachPart = g.coachName ? `${g.coachName} - ` : "";
          return `${sched} (${coachPart}${g.level.toUpperCase()})`;
        });
        const groupTypes = orderedGroups.map((g) => g.level);
        const multiResolved = resolveMultiGroupFormula(groupTypes);
        formula = multiResolved.formula;
        frequency = `${multiResolved.frequency}x`;
        resolvedPriceDA = calculateSwimPrice({
          category,
          groupTypes,
          duration,
        });
      }
    } else if (!isNew) {
      // Standardize formula if it was passed as a card tier name ("starter", "silver", etc.)
      const lowerForm = formula.toLowerCase();
      if (
        lowerForm === "starter" ||
        lowerForm === "silver" ||
        lowerForm === "gold" ||
        lowerForm === "diamond"
      ) {
        formula = "G10";
      } else {
        formula = formula.toUpperCase();
      }
      if (resolvedPriceDA === null) {
        resolvedPriceDA = calculateSwimPrice({
          category,
          groupType: formula,
          duration,
          frequency,
        });
      }
    } else {
      formula = formula.toUpperCase();
    }

    // Structured metadata capture
    const rawArticles =
      body.articles ||
      body.payload?.articles ||
      (typeof body.equipmentPack === "string" && body.equipmentPack !== "Oui"
        ? body.equipmentPack.split(",")
        : []);
    const hasEquipment = Boolean(
      body.equipmentPack ||
        body.payload?.equipement ||
        (Array.isArray(rawArticles) &&
          rawArticles.filter((a: string) => a !== "none").length > 0)
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
        timePref:
          selectedGroupNames.length > 0
            ? selectedGroupNames.join(" + ")
            : body.dayNight || body.payload?.timePref || null,
        memberType: !isNew ? "old" : "new",
        personalId: resolvedPersonalId,
        memberId: resolvedMemberId,
        pool: body.pool || body.payload?.piscine || null,
        selectedGroupIds,
        selectedGroupNames,
        priceDA: resolvedPriceDA,
      },
      userNotes: body.notes || body.payload?.notes || null,
    });

    if (!fullName) {
      fullName = isNew
        ? "Nouveau Client Inscription"
        : `Ancien Adherent ${resolvedPersonalId || ""}`.trim();
    }

    if (!phone) {
      phone = "0000000000";
    }

    const preferredDaysValue =
      selectedGroupNames.length > 0
        ? selectedGroupNames.join(" + ")
        : body.dayNight || body.payload?.timePref || null;

    // If this is an old member who already has a pending/waiting lead, update it in place
    let existingPendingLeadId: string | null = null;
    if (!isNew && resolvedPersonalId) {
      const existingPending = await prisma.swimLead.findFirst({
        where: {
          status: { in: ["pending", "waiting"] },
          notes: { contains: resolvedPersonalId },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existingPending) {
        existingPendingLeadId = existingPending.id;
      }
    }

    const lead = existingPendingLeadId
      ? await prisma.swimLead.update({
          where: { id: existingPendingLeadId },
          data: {
            fullName,
            phone,
            email,
            category,
            level,
            frequency,
            formula,
            duration,
            preferredDays: preferredDaysValue,
            notes: formattedNotes,
            status: "pending",
          },
        })
      : await prisma.swimLead.create({
          data: {
            fullName,
            phone,
            email,
            category,
            level,
            frequency,
            formula,
            duration,
            preferredDays: preferredDaysValue,
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
