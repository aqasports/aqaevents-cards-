import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimId, generateSwimToken, generateSwimCardCode } from "@/lib/swim-id";
import { calculateSwimPrice, SwimCategory, SwimDuration, SwimFrequency } from "@/lib/swim-pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const level = searchParams.get("level");
  const groupId = searchParams.get("groupId");
  const paymentStatus = searchParams.get("paymentStatus");

  try {
    const where: any = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { swimId: { contains: q, mode: "insensitive" } },
      ];
    }
    if (level && level !== "all") where.level = level;
    if (groupId && groupId !== "all") where.groupId = groupId;
    if (paymentStatus && paymentStatus !== "all") where.paymentStatus = paymentStatus;

    const members = await prisma.swimMember.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        group: true,
        card: true,
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    return NextResponse.json(members);
  } catch (err: unknown) {
    logger.error("GET admin swim members error:", err);
    return NextResponse.json({ error: "Failed to fetch swim members" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      photoUrl,
      dateOfStart,
      category,
      level,
      groupId,
      formula,
      duration,
      frequency,
      priceDA,
      coachMessage,
      paymentStatus,
      notes,
      issueCard,
      cardCode,
    } = body;

    if (!fullName || !level || !formula) {
      return NextResponse.json(
        { error: "Full name, level and formula are required" },
        { status: 400 }
      );
    }

    const cat = (category || "homme") as SwimCategory;
    const dur = (duration || "3m") as SwimDuration;
    const freq = (frequency || "1x") as SwimFrequency;

    const calculatedPrice = priceDA ? parseInt(priceDA, 10) : calculateSwimPrice(cat, formula, dur, freq);

    // Generate collision-free swimId
    let swimId = generateSwimId();
    let existing = await prisma.swimMember.findUnique({ where: { swimId } });
    while (existing) {
      swimId = generateSwimId();
      existing = await prisma.swimMember.findUnique({ where: { swimId } });
    }

    const member = await prisma.swimMember.create({
      data: {
        swimId,
        fullName: fullName.trim(),
        phone: phone?.trim() || "",
        email: email?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        dateOfStart: dateOfStart ? new Date(dateOfStart) : new Date(),
        category: cat,
        level: level.trim(),
        groupId: groupId || null,
        formula: formula.trim(),
        duration: dur,
        priceDA: calculatedPrice,
        coachMessage: coachMessage?.trim() || null,
        paymentStatus: paymentStatus || "unpaid",
        groupStatus: groupId ? "proposed" : "proposed",
        notes: notes?.trim() || null,
      },
    });

    // If an initial card should be issued
    let card = null;
    if (issueCard) {
      const token = generateSwimToken();
      const code = cardCode?.trim() ? cardCode.trim().toUpperCase() : generateSwimCardCode();

      card = await prisma.swimCard.create({
        data: {
          memberId: member.id,
          publicToken: token,
          cardCode: code,
          status: "active",
        },
      });
    }

    return NextResponse.json({ ...member, card }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST admin swim member error:", err);
    return NextResponse.json({ error: "Failed to create swim member" }, { status: 500 });
  }
}
