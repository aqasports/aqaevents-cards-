import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  decodeMemberGroupIds,
  decodeSolidNotes,
  parseScheduleSlots,
  FRENCH_DAYS,
} from "@/lib/swim-groups";

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

  const { limited } = await checkAndIncrement(`public-inscriptions-verify:${ip}`, {
    windowMs: 60_000,
    max: 60,
  });

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();
    const rawId = String(body.personalId || body.id || "").trim();

    if (!rawId) {
      return NextResponse.json(
        { verified: false, error: "Missing personal ID" },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanUpper = rawId.toUpperCase().replace(/\s+/g, "");
    const cleanDigits = rawId.replace(/\D/g, "");
    const formattedSwmCode =
      cleanDigits.length === 6 ? `SWM-${cleanDigits}` : cleanUpper;

    // 1. Try direct exact match on swimId, internal id, card.cardCode, or card.publicToken
    let member = await prisma.swimMember.findFirst({
      where: {
        OR: [
          { swimId: { equals: cleanUpper, mode: "insensitive" } },
          { swimId: { equals: formattedSwmCode, mode: "insensitive" } },
          { id: rawId },
          {
            card: {
              OR: [
                { cardCode: { equals: cleanUpper, mode: "insensitive" } },
                { cardCode: { equals: formattedSwmCode, mode: "insensitive" } },
                { publicToken: rawId },
              ],
            },
          },
        ],
      },
      include: { group: true, card: true },
    });

    // 2. Fallback search across SwimMember by swimId/cardCode suffix (>= 4 chars/digits) or phone digits
    if (!member) {
      const suffixToken =
        cleanDigits.length >= 4 ? cleanDigits : cleanUpper.replace(/^SWM-?/i, "");
      const orConditions: Record<string, unknown>[] = [
        { swimId: { equals: cleanUpper, mode: "insensitive" } },
      ];
      if (suffixToken.length >= 4) {
        orConditions.push(
          { swimId: { endsWith: suffixToken, mode: "insensitive" } },
          {
            card: {
              cardCode: { endsWith: suffixToken, mode: "insensitive" },
            },
          }
        );
      }
      if (cleanDigits.length >= 8) {
        const last8 = cleanDigits.slice(-8);
        orConditions.push({
          phone: { contains: last8 },
        });
      }

      const candidates = await prisma.swimMember.findMany({
        where: { OR: orConditions },
        include: { group: true, card: true },
        take: 50,
      });

      member =
        candidates.find((m) => {
          const sId = m.swimId.toUpperCase();
          const sDigits = sId.replace(/\D/g, "");
          const cCode = (m.card?.cardCode || "").toUpperCase();
          const cDigits = cCode.replace(/\D/g, "");
          const mPhone = m.phone.replace(/\D/g, "");

          if (
            sId === cleanUpper ||
            sId === formattedSwmCode ||
            cCode === cleanUpper ||
            cCode === formattedSwmCode
          ) {
            return true;
          }
          if (
            suffixToken.length >= 4 &&
            (sId.endsWith(suffixToken) ||
              (cCode && cCode.endsWith(suffixToken)) ||
              (cleanDigits.length >= 4 &&
                (sDigits.endsWith(cleanDigits) ||
                  (cDigits && cDigits.endsWith(cleanDigits)))))
          ) {
            return true;
          }
          if (
            cleanDigits.length >= 8 &&
            mPhone.length >= 8 &&
            (mPhone.endsWith(cleanDigits) || cleanDigits.endsWith(mPhone))
          ) {
            return true;
          }
          return false;
        }) ?? null;
    }

    if (!member) {
      return NextResponse.json(
        { verified: false },
        { status: 200, headers: corsHeaders }
      );
    }

    const firstName = member.fullName.split(" ")[0];

    // Check all active assigned groups (primary + multi-group notes)
    const assignedIds = decodeMemberGroupIds(member.notes, member.groupId);
    const assignedGroups =
      assignedIds.length > 0
        ? await prisma.swimGroup.findMany({
            where: { id: { in: assignedIds }, active: true },
          })
        : [];

    // A member is treated as unassigned if they have no active assigned groups
    // OR if their proposed group was rejected.
    const hasAssignedGroup =
      assignedGroups.length > 0 && member.groupStatus !== "rejected";
    const freqNum = assignedGroups.length > 0 ? assignedGroups.length : 1;

    const matchedGroups = assignedGroups.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.name,
      slotKey: g.schedule || "",
      level: g.level,
      coachName: g.coachName || null,
    }));

    function getCategoryAliases(rawCat?: string | null): string[] {
      const c = (rawCat || "homme").toLowerCase().trim();
      if (c === "homme" || c === "men" || c === "teens" || c === "ados") {
        return ["homme", "men", "teens", "ados"];
      }
      if (c === "femme" || c === "women") {
        return ["femme", "women"];
      }
      if (c === "enfants" || c === "kids") {
        return ["enfants", "kids"];
      }
      if (c === "apnea" || c === "apnee") {
        return ["apnea", "apnee"];
      }
      return [c];
    }

    // If the old member has no assigned group yet, fetch remaining available groups
    // for their category WITHOUT any assigned swimmers' names.
    let availableGroups: Array<{
      id: string;
      name: string;
      category: string;
      level: string;
      coachName: string | null;
      schedule: string;
      slots: Array<{ day: string; time: string; location: string }>;
      capacity: number;
      remaining: number;
      isSolid: boolean;
    }> = [];

    if (!hasAssignedGroup) {
      const categoryGroups = await prisma.swimGroup.findMany({
        where: {
          active: true,
          category: { in: getCategoryAliases(member.category) },
        },
        include: {
          _count: {
            select: { swimmers: true },
          },
        },
      });

      // Account for secondary multi-group assignments stored in SwimMember.notes
      const multiGroupMembers = await prisma.swimMember.findMany({
        where: {
          groupId: { not: null },
          notes: { contains: "[GROUPS:" },
        },
        select: { id: true, groupId: true, notes: true },
      });

      const extraCounts: Record<string, number> = {};
      for (const m of multiGroupMembers) {
        const gids = decodeMemberGroupIds(m.notes, m.groupId);
        for (const gid of gids) {
          if (gid !== m.groupId) {
            extraCounts[gid] = (extraCounts[gid] || 0) + 1;
          }
        }
      }

      const mappedCategoryGroups = categoryGroups
        .map((g) => {
          const { isSolid } = decodeSolidNotes(g.notes);
          const totalSwimmers =
            (g._count?.swimmers ?? 0) + (extraCounts[g.id] || 0);
          const remaining = Math.max(0, g.capacity - totalSwimmers);
          const parsedSlots = parseScheduleSlots(g.schedule);
          return {
            id: g.id,
            name: g.name,
            category: g.category,
            level: g.level,
            coachName: g.coachName || null,
            schedule: g.schedule,
            slots: parsedSlots,
            capacity: g.capacity,
            remaining,
            isSolid,
          };
        })
        .sort((a, b) => {
          const slotA = a.slots[0];
          const slotB = b.slots[0];
          const dayIdxA = FRENCH_DAYS.findIndex(
            (d) => d.toLowerCase() === (slotA?.day || "").toLowerCase()
          );
          const dayIdxB = FRENCH_DAYS.findIndex(
            (d) => d.toLowerCase() === (slotB?.day || "").toLowerCase()
          );
          const normDayA = dayIdxA === -1 ? 99 : dayIdxA;
          const normDayB = dayIdxB === -1 ? 99 : dayIdxB;
          if (normDayA !== normDayB) return normDayA - normDayB;
          return (slotA?.time || "").localeCompare(slotB?.time || "");
        });

      const nonFull = mappedCategoryGroups.filter((g) => g.remaining > 0);
      availableGroups =
        nonFull.length > 0
          ? nonFull
          : mappedCategoryGroups.map((g) => ({
              ...g,
              remaining: Math.max(1, g.remaining),
            }));
    }

    return NextResponse.json(
      {
        verified: true,
        hasAssignedGroup,
        member: {
          id: member.swimId,
          dbId: member.id,
          fullName: member.fullName,
          firstName,
          phone: member.phone,
          category: member.category,
          level: member.level,
          pool: "reghaia",
          membershipTier: member.formula || "G10",
          duration: member.duration || "1m",
          hasAssignedGroup,
          proposed_formule: {
            tier: member.formula || "G10",
            frequency: freqNum,
          },
          coach_recommendation: member.coachMessage || null,
          recommended_slots: assignedGroups
            .map((g) => g.schedule)
            .filter(Boolean),
        },
        proposed_formule: {
          tier: member.formula || "G10",
          frequency: freqNum,
        },
        coach_recommendation: member.coachMessage || null,
        recommended_slots: assignedGroups
          .map((g) => g.schedule)
          .filter(Boolean),
        groups: matchedGroups,
        availableGroups,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST /api/public/inscriptions/verify error:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
