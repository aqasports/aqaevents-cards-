import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimId, generateSwimToken, generateSwimCardCode } from "@/lib/swim-id";
import { computeMemberSubscriptionDates } from "@/lib/swim-subscription";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const level = searchParams.get("level");
  const groupId = searchParams.get("groupId");
  const paymentStatus = searchParams.get("paymentStatus");
  const category = searchParams.get("category");

  try {
    const where: Record<string, unknown> = {};
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
    if (category && category !== "all") where.category = category;

    const includePayments = searchParams.get("includePayments") === "true";

    const members = await prisma.swimMember.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            coachName: true,
            schedule: true,
            category: true,
            active: true,
          },
        },
        card: {
          select: {
            id: true,
            cardCode: true,
            publicToken: true,
            status: true,
          },
        },
        ...(includePayments
          ? {
              payments: {
                orderBy: { paidAt: "desc" },
              },
            }
          : {}),
      },
    });

    // Enrich each member with effectiveGroup / effectivelyUnassigned
    const enriched = members.map((m) => {
      const effectivelyUnassigned = !!(m.groupId && m.group && !m.group.active);
      return {
        ...m,
        effectiveGroup: effectivelyUnassigned ? null : m.group,
        effectivelyUnassigned,
      };
    });

    return NextResponse.json(enriched);
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
      whatsapp,
      email,
      photoUrl,
      dateOfStart,
      category,
      level,
      groupId,
      formula,
      duration,
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

    // Price is provided directly or defaults to 0 - no auto-calculation
    const finalPriceDA = priceDA ? parseInt(priceDA, 10) : 0;

    // Generate collision-free swimId
    let swimId = generateSwimId();
    let existing = await prisma.swimMember.findUnique({ where: { swimId } });
    while (existing) {
      swimId = generateSwimId();
      existing = await prisma.swimMember.findUnique({ where: { swimId } });
    }

    let finalNotes = notes?.trim() || null;
    if (whatsapp && typeof whatsapp === "string" && whatsapp.trim()) {
      const waTrimmed = whatsapp.trim();
      if (!finalNotes) {
        finalNotes = `WhatsApp: ${waTrimmed}`;
      } else if (!finalNotes.toLowerCase().includes("whatsapp")) {
        finalNotes = `${finalNotes} | WhatsApp: ${waTrimmed}`;
      }
    }

    // Validate groupId if provided
    if (groupId) {
      const targetGroup = await prisma.swimGroup.findUnique({ where: { id: groupId } });
      if (targetGroup && !targetGroup.active) {
        return NextResponse.json({ error: "Cannot assign to an archived group" }, { status: 400 });
      }
      if (targetGroup && targetGroup.category !== (category || "homme")) {
        return NextResponse.json(
          { error: "Group category does not match member category" },
          { status: 400 }
        );
      }
    }

    const member = await prisma.swimMember.create({
      data: {
        swimId,
        fullName: fullName.trim(),
        phone: phone?.trim() || "",
        email: email?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        dateOfStart: dateOfStart ? new Date(dateOfStart) : new Date(),
        category: category || "homme",
        level: level.trim(),
        groupId: groupId || null,
        formula: formula.trim(),
        duration: duration || "3m",
        priceDA: finalPriceDA,
        coachMessage: coachMessage?.trim() || null,
        paymentStatus: paymentStatus || "unpaid",
        groupStatus: "proposed",
        notes: finalNotes,
        ...computeMemberSubscriptionDates(
          dateOfStart ? new Date(dateOfStart) : new Date(),
          duration || "3m"
        ),
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
