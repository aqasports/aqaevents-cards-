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

    const cleanUpper = rawId.toUpperCase();
    const cleanDigits = rawId.replace(/\D/g, "");

    // Search SwimMember by swimId (exact or endsWith), phone, or fullName
    const members = await prisma.swimMember.findMany({
      include: {
        group: true,
      },
      take: 20,
    });

    const member = members.find((m) => {
      const sId = m.swimId.toUpperCase();
      const mPhone = m.phone.replace(/\D/g, "");
      if (sId === cleanUpper || (cleanUpper.length >= 4 && sId.endsWith(cleanUpper))) {
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
    });

    if (!member) {
      return NextResponse.json(
        { verified: false },
        { status: 200, headers: corsHeaders }
      );
    }

    const firstName = member.fullName.split(" ")[0];
    const freqNum = 1;

    const matchedGroups = member.group
      ? [
          {
            id: member.group.id,
            name: member.group.name,
            code: member.group.name,
            slotKey: member.group.schedule || "",
          },
        ]
      : [];

    return NextResponse.json(
      {
        verified: true,
        member: {
          id: member.swimId,
          fullName: member.fullName,
          firstName,
          phone: member.phone,
          category: member.category,
          pool: "reghaia",
          membershipTier: member.formula || "G10",
          proposed_formule: {
            tier: member.formula || "G10",
            frequency: freqNum,
          },
          coach_recommendation: member.coachMessage || null,
          recommended_slots: member.group?.schedule ? [member.group.schedule] : [],
        },
        proposed_formule: {
          tier: member.formula || "G10",
          frequency: freqNum,
        },
        coach_recommendation: member.coachMessage || null,
        recommended_slots: member.group?.schedule ? [member.group.schedule] : [],
        groups: matchedGroups,
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
