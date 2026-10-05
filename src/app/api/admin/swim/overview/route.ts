import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseSwimLeadNotes } from "@/lib/swim-lead-details";
import { decodeSolidNotes, decodeMemberGroupIds } from "@/lib/swim-groups";
import { getSwimCardUrl } from "@/lib/swim-id";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const [rawMembers, rawLeads, rawGroups, multiGroupMembers, rawCards] = await Promise.all([
      // 1. Swimmer members with relations
      prisma.swimMember.findMany({
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
          payments: {
            orderBy: { paidAt: "desc" },
            select: {
              id: true,
              amount: true,
              method: true,
              notes: true,
              paidAt: true,
            },
          },
        },
      }),

      // 2. Swimmer leads
      prisma.swimLead.findMany({
        orderBy: { createdAt: "desc" },
      }),

      // 3. Swimmer groups with swimmer counts
      prisma.swimGroup.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { swimmers: true },
          },
        },
      }),

      // 4. Secondary multi-group assignments stored in member notes
      prisma.swimMember.findMany({
        where: {
          groupId: { not: null },
          notes: { contains: "[GROUPS:" },
        },
        select: { id: true, groupId: true, notes: true },
      }),

      // 5. Swim cards
      prisma.swimCard.findMany({
        orderBy: { issuedAt: "desc" },
        include: {
          member: {
            select: {
              fullName: true,
              swimId: true,
            },
          },
        },
      }),
    ]);

    // Member enrichment: calculate effectiveGroup and effectivelyUnassigned
    const members = rawMembers.map((m) => {
      const effectivelyUnassigned = Boolean(m.groupId && m.group && !m.group.active);
      return {
        ...m,
        effectiveGroup: effectivelyUnassigned ? null : m.group,
        effectivelyUnassigned,
      };
    });

    // Lead enrichment: parse lead details and user notes
    const leads = rawLeads.map((lead) => ({
      ...lead,
      details: parseSwimLeadNotes(lead.notes),
    }));

    // Group enrichment: multi-group counts + decodeSolidNotes + clean legacy names
    const extraCounts: Record<string, number> = {};
    for (const m of multiGroupMembers) {
      const gids = decodeMemberGroupIds(m.notes, m.groupId);
      for (const gid of gids) {
        if (gid !== m.groupId) {
          extraCounts[gid] = (extraCounts[gid] || 0) + 1;
        }
      }
    }

    const groups = rawGroups.map((g) => {
      const { isSolid, cleanNotes } = decodeSolidNotes(g.notes);
      const secondaryCount = extraCounts[g.id] || 0;
      const cleanSchedule = g.schedule
        ? g.schedule.replace(/Bassin Olympique|Piscine Olympique/g, "Azal")
        : g.schedule;
      return {
        ...g,
        schedule: cleanSchedule,
        isSolid,
        cleanNotes,
        _count: {
          swimmers: (g._count?.swimmers ?? 0) + secondaryCount,
        },
      };
    });

    // Cards enrichment: fast URL generation without synchronous image encoding
    const cards = rawCards.map((c) => ({
      ...c,
      url: getSwimCardUrl(c.publicToken),
      qrDataUrl: "",
    }));

    return NextResponse.json(
      {
        members,
        leads,
        groups,
        cards,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    logger.error("GET admin swim overview error:", err);
    return NextResponse.json({ error: "Failed to fetch swim overview data" }, { status: 500 });
  }
}
