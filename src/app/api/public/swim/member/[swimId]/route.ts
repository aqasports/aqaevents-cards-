import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decodeSolidNotes, decodeMemberGroupIds, isOldSwimMember } from "@/lib/swim-groups";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function enrichMemberGroups(member: any) {
  const isOldMember = isOldSwimMember(member.level);
  const allGroupIds = decodeMemberGroupIds(member.notes, member.groupId);
  if (allGroupIds.length === 0 && member.groupId) {
    allGroupIds.push(member.groupId);
  }

  let allGroups: any[] = [];
  if (allGroupIds.length > 0) {
    const dbGroups = await prisma.swimGroup.findMany({
      where: { id: { in: allGroupIds } },
      include: {
        swimmers: {
          select: {
            id: true,
            swimId: true,
            fullName: true,
            groupStatus: true,
          },
        },
      },
    });

    // Find secondary swimmers assigned to any of these groups via notes
    const secondarySwimmers = await prisma.swimMember.findMany({
      where: {
        groupId: { notIn: allGroupIds },
        notes: { contains: "[GROUPS:" },
      },
      select: {
        id: true,
        swimId: true,
        fullName: true,
        groupStatus: true,
        groupId: true,
        notes: true,
      },
    });

    for (const g of dbGroups) {
      const primarySwimmers = g.swimmers || [];
      const extraSwimmers = secondarySwimmers.filter((m) =>
        decodeMemberGroupIds(m.notes, m.groupId).includes(g.id)
      );

      const seenIds = new Set<string>();
      const combinedSwimmers: Array<{ id: string; swimId: string; fullName: string; groupStatus: string }> = [];
      for (const s of [...primarySwimmers, ...extraSwimmers]) {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          combinedSwimmers.push({
            id: s.id,
            swimId: s.swimId,
            fullName: s.fullName,
            groupStatus: s.groupStatus,
          });
        }
      }

      // Rule: in all the platform only old members can see group table (names), and do not show/leak swimmer IDs
      const groupMembers = isOldMember
        ? combinedSwimmers.map((s, idx) => ({
            num: idx + 1,
            id: s.id,
            swimId: s.swimId === member.swimId ? s.swimId : undefined,
            fullName: s.fullName,
            groupStatus: s.groupStatus,
            isCurrentMember: s.swimId === member.swimId,
          }))
        : [];

      const teammates = isOldMember
        ? combinedSwimmers
            .filter((s) => s.swimId !== member.swimId)
            .map((s) => (s.fullName || "").trim().split(/\s+/)[0] || "")
            .filter(Boolean)
        : [];

      const { isSolid, cleanNotes: solidNotes } = decodeSolidNotes(g.notes);

      allGroups.push({
        ...g,
        isSolid,
        solidNotes,
        groupMembers,
        teammates,
      });
    }

    allGroups.sort((a, b) => allGroupIds.indexOf(a.id) - allGroupIds.indexOf(b.id));
  } else if (member.group) {
    const primarySwimmers = member.group.swimmers || [];
    const groupMembers = isOldMember
      ? primarySwimmers.map((s: any, idx: number) => ({
          num: idx + 1,
          id: s.id,
          swimId: s.swimId === member.swimId ? s.swimId : undefined,
          fullName: s.fullName,
          groupStatus: s.groupStatus,
          isCurrentMember: s.swimId === member.swimId,
        }))
      : [];
    const teammates = isOldMember
      ? primarySwimmers
          .filter((s: any) => s.swimId !== member.swimId)
          .map((s: any) => (s.fullName || "").trim().split(/\s+/)[0] || "")
          .filter(Boolean)
      : [];
    const { isSolid, cleanNotes: solidNotes } = decodeSolidNotes(member.group.notes);

    allGroups = [
      {
        ...member.group,
        isSolid,
        solidNotes,
        groupMembers,
        teammates,
      },
    ];
  }

  const primaryGroup = allGroups[0] || member.group || null;
  const isSolid = primaryGroup?.isSolid ?? (primaryGroup ? decodeSolidNotes(primaryGroup.notes).isSolid : false);
  const solidNotes = primaryGroup?.solidNotes ?? (primaryGroup ? decodeSolidNotes(primaryGroup.notes).cleanNotes : "");
  const rootGroupMembers = primaryGroup?.groupMembers || [];
  const rootTeammates = primaryGroup?.teammates || [];

  return {
    allGroups,
    isOldMember,
    isSolid,
    solidNotes,
    groupMembers: rootGroupMembers,
    teammates: rootTeammates,
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swimId: string }> }
) {
  const { swimId } = await params;
  const normalizedId = swimId.trim().toUpperCase();

  try {
    let member = await prisma.swimMember.findUnique({
      where: { swimId: normalizedId },
      include: {
        group: {
          include: {
            swimmers: {
              select: {
                id: true,
                swimId: true,
                fullName: true,
                groupStatus: true,
              },
            },
          },
        },
        card: true,
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            notes: true,
            paidAt: true,
          },
          orderBy: { paidAt: "desc" },
        },
      },
    });

    // Fallback: search by phone or partial ID if not matched directly
    if (!member) {
      const cleanDigits = normalizedId.replace(/\D/g, "");
      const allMembers = await prisma.swimMember.findMany({
        include: {
          group: {
            include: {
              swimmers: {
                select: {
                  id: true,
                  swimId: true,
                  fullName: true,
                  groupStatus: true,
                },
              },
            },
          },
          card: true,
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              notes: true,
              paidAt: true,
            },
            orderBy: { paidAt: "desc" },
          },
        },
        take: 30,
      });

      member = allMembers.find((m) => {
        const sId = m.swimId.toUpperCase();
        const mPhone = m.phone.replace(/\D/g, "");
        if (sId === normalizedId || (normalizedId.length >= 4 && sId.endsWith(normalizedId))) {
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
      }) || null;
    }

    if (!member) {
      return NextResponse.json(
        { error: "Swimmer profile not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Auto-create active card if member has none so digital pass card works immediately
    if (!member.card) {
      try {
        const publicToken = nanoid(16);
        const cardCode = `SWM-${Math.floor(100000 + Math.random() * 900000)}`;
        const createdCard = await prisma.swimCard.create({
          data: {
            memberId: member.id,
            publicToken,
            cardCode,
            status: "active",
          },
        });
        member = { ...member, card: createdCard };
      } catch {
        // Continue gracefully if concurrent creation
      }
    }

    const enriched = await enrichMemberGroups(member);

    return NextResponse.json(
      {
        ...member,
        groups: enriched.allGroups,
        isOldMember: enriched.isOldMember,
        isSolid: enriched.isSolid,
        solidNotes: enriched.solidNotes,
        teammates: enriched.teammates,
        groupMembers: enriched.groupMembers,
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("GET public swim member error:", err);
    return NextResponse.json(
      { error: "Failed to fetch swimmer profile" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ swimId: string }> }
) {
  const { swimId } = await params;
  const normalizedId = swimId.trim().toUpperCase();

  try {
    const body = await request.json();
    const { action, reason, preferredDays } = body;

    let member = await prisma.swimMember.findUnique({
      where: { swimId: normalizedId },
    });

    if (!member) {
      const cleanDigits = normalizedId.replace(/\D/g, "");
      const allMembers = await prisma.swimMember.findMany({ take: 30 });
      member =
        allMembers.find((m) => {
          const sId = m.swimId.toUpperCase();
          const mPhone = m.phone.replace(/\D/g, "");
          if (sId === normalizedId || (normalizedId.length >= 4 && sId.endsWith(normalizedId))) {
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
        }) || null;
    }

    if (!member) {
      return NextResponse.json(
        { error: "Swimmer profile not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (action === "accept") {
      const updated = await prisma.swimMember.update({
        where: { id: member.id },
        data: { groupStatus: "accepted" },
        include: {
          group: {
            include: {
              swimmers: {
                select: {
                  id: true,
                  swimId: true,
                  fullName: true,
                  groupStatus: true,
                },
              },
            },
          },
          card: true,
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              notes: true,
              paidAt: true,
            },
            orderBy: { paidAt: "desc" },
          },
        },
      });

      const enriched = await enrichMemberGroups(updated);

      return NextResponse.json(
        {
          success: true,
          member: {
            ...updated,
            groups: enriched.allGroups,
            isOldMember: enriched.isOldMember,
            isSolid: enriched.isSolid,
            solidNotes: enriched.solidNotes,
            teammates: enriched.teammates,
            groupMembers: enriched.groupMembers,
          },
        },
        { headers: corsHeaders }
      );
    } else if (action === "reject") {
      const updated = await prisma.swimMember.update({
        where: { id: member.id },
        data: {
          groupStatus: "rejected",
          rejectionReason: reason || null,
        },
      });

      // Create a lead in wait list for re-inscription with new availability
      await prisma.swimLead.create({
        data: {
          fullName: member.fullName,
          phone: member.phone,
          email: member.email,
          category: member.category,
          level: member.level,
          formula: member.formula,
          duration: member.duration,
          preferredDays: preferredDays || null,
          notes: `Re-inscription request from ${member.swimId} (rejected proposed group: ${reason || "schedule mismatch"})`,
          status: "pending",
        },
      });

      return NextResponse.json(
        { success: true, member: updated, reinscriptionCreated: true },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST public swim member decision error:", err);
    return NextResponse.json(
      { error: "Failed to submit decision" },
      { status: 500, headers: corsHeaders }
    );
  }
}
