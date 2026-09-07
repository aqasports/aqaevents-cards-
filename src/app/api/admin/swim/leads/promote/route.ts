import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimId, generateSwimToken, generateSwimCardCode } from "@/lib/swim-id";
import { calculateSwimPrice, SwimCategory, SwimDuration, SwimFrequency } from "@/lib/swim-pricing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { leadId, groupId, coachMessage, priceDA, issueCard, cardCode } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const lead = await prisma.swimLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const category = (lead.category || "homme") as SwimCategory;
    const formula = lead.formula || "G10";
    const duration = (lead.duration || "3m") as SwimDuration;
    const frequency = (lead.frequency || "1x") as SwimFrequency;

    const finalPrice = priceDA ?? calculateSwimPrice(category, formula, duration, frequency);

    // Generate unique swimId
    let swimId = generateSwimId();
    let collisionCheck = await prisma.swimMember.findUnique({ where: { swimId } });
    while (collisionCheck) {
      swimId = generateSwimId();
      collisionCheck = await prisma.swimMember.findUnique({ where: { swimId } });
    }

    // Create member
    const member = await prisma.swimMember.create({
      data: {
        swimId,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        dateOfStart: new Date(),
        category,
        level: lead.level || "beginner",
        groupId: groupId || null,
        formula,
        duration,
        priceDA: finalPrice,
        coachMessage: coachMessage || null,
        paymentStatus: "unpaid",
        groupStatus: groupId ? "proposed" : "proposed",
      },
    });

    // Optionally link or create card
    if (issueCard) {
      const token = generateSwimToken();
      const code = cardCode?.trim() ? cardCode.trim().toUpperCase() : generateSwimCardCode();

      await prisma.swimCard.create({
        data: {
          memberId: member.id,
          publicToken: token,
          cardCode: code,
          status: "active",
        },
      });
    }

    // Update lead status to confirmed
    await prisma.swimLead.update({
      where: { id: leadId },
      data: { status: "confirmed" },
    });

    return NextResponse.json({ member, swimId }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST promote swim lead error:", err);
    return NextResponse.json({ error: "Failed to promote lead to member" }, { status: 500 });
  }
}
