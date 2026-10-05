import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimToken, generateSwimCardCode, getSwimCardUrl } from "@/lib/swim-id";
import { decodeMemberGroupIds } from "@/lib/swim-groups";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
} from "@/lib/swim-subscription";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const includeMembers = searchParams.get("includeMembers") === "true";
  const includeQr = searchParams.get("includeQr") === "true";

  try {
    const where: Record<string, unknown> = {};
    if (filter === "blank") {
      where.memberId = null;
    } else if (filter === "assigned") {
      where.memberId = { not: null };
    }

    const [cards, rawMembers, allGroups] = await Promise.all([
      prisma.swimCard.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        include: {
          member: {
            include: {
              group: true,
            },
          },
        },
      }),
      includeMembers
        ? prisma.swimMember.findMany({
            orderBy: { createdAt: "desc" },
            include: {
              group: true,
              card: true,
            },
          })
        : Promise.resolve([]),
      includeMembers
        ? prisma.swimGroup.findMany({
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const enrichedCards = await Promise.all(
      cards.map(async (c) => {
        const url = getSwimCardUrl(c.publicToken);
        const qrDataUrl = includeQr
          ? await QRCode.toDataURL(url, {
              width: 250,
              margin: 1,
              color: { dark: "#0f172a", light: "#ffffff" },
            })
          : "";

        return {
          ...c,
          url,
          qrDataUrl,
        };
      })
    );

    if (!includeMembers) {
      return NextResponse.json(enrichedCards);
    }

    const groupMap = new Map(allGroups.map((g) => [g.id, g]));

    const enrichedMembers = rawMembers.map((m) => {
      const groupIds = decodeMemberGroupIds(m.notes, m.groupId);
      const memberGroups =
        groupIds.length > 0
          ? groupIds
              .map((gid) => groupMap.get(gid))
              .filter((g): g is NonNullable<typeof g> => Boolean(g))
          : m.group
          ? [m.group]
          : [];

      const effectiveGroups = memberGroups.filter((g) => g.active);
      const effectiveGroup = effectiveGroups[0] || null;
      const effectivelyUnassigned = effectiveGroups.length === 0;

      const subStart = getEffectiveSubscriptionStart(
        m.subscriptionStart ?? m.dateOfStart ?? m.createdAt
      );
      const subEnd = m.subscriptionEnd
        ? new Date(m.subscriptionEnd)
        : computeSubscriptionEnd(subStart, m.duration);

      return {
        ...m,
        groups: memberGroups,
        effectiveGroups,
        effectiveGroup,
        effectivelyUnassigned,
        subscriptionStart: subStart.toISOString(),
        subscriptionEnd: subEnd.toISOString(),
      };
    });

    return NextResponse.json({
      cards: enrichedCards,
      members: enrichedMembers,
      groups: allGroups,
    });
  } catch (err: unknown) {
    logger.error("GET admin swim cards error:", err);
    return NextResponse.json({ error: "Failed to fetch swim cards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const count = Math.min(Math.max(parseInt(body.count || "10", 10), 1), 100);

    const createdCards = [];
    for (let i = 0; i < count; i++) {
      let code = generateSwimCardCode();
      let collision = await prisma.swimCard.findUnique({ where: { cardCode: code } });
      while (collision) {
        code = generateSwimCardCode();
        collision = await prisma.swimCard.findUnique({ where: { cardCode: code } });
      }

      const token = generateSwimToken();
      const card = await prisma.swimCard.create({
        data: {
          publicToken: token,
          cardCode: code,
          status: "active",
        },
      });

      const url = getSwimCardUrl(card.publicToken);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 250,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      createdCards.push({
        ...card,
        url,
        qrDataUrl,
      });
    }

    return NextResponse.json({ created: createdCards.length, cards: createdCards }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST admin swim cards batch error:", err);
    return NextResponse.json({ error: "Failed to generate swim cards batch" }, { status: 500 });
  }
}
