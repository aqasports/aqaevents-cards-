import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decodeSolidNotes, decodeMemberGroupIds } from "@/lib/swim-groups";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    const isSolid = member.group ? decodeSolidNotes(member.group.notes).isSolid : false;
    const solidNotes = member.group ? decodeSolidNotes(member.group.notes).cleanNotes : "";

    const teammates = member.group?.swimmers
      ? member.group.swimmers
          .filter((s) => s.swimId !== member.swimId)
          .map((s) => {
            const parts = s.fullName.trim().split(/\s+/);
            return parts[0] || "";
          })
          .filter(Boolean)
      : [];

    const groupMembers = member.group?.swimmers
      ? member.group.swimmers.map((s, idx) => ({
          num: idx + 1,
          id: s.id,
          swimId: s.swimId,
          fullName: s.fullName,
          groupStatus: s.groupStatus,
          isCurrentMember: s.swimId === member.swimId,
        }))
      : [];

    // Multi-group support: load all assigned training groups
    const allGroupIds = decodeMemberGroupIds(member.notes, member.groupId);
    let allGroups: typeof member.group[] = [];
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
      allGroups = dbGroups.sort(
        (a, b) => allGroupIds.indexOf(a.id) - allGroupIds.indexOf(b.id)
      ) as unknown as typeof member.group[];
    } else if (member.group) {
      allGroups = [member.group];
    }

    return NextResponse.json(
      {
        ...member,
        groups: allGroups,
        isSolid,
        solidNotes,
        teammates,
        groupMembers,
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

      const isSolid = updated.group ? decodeSolidNotes(updated.group.notes).isSolid : false;
      const solidNotes = updated.group ? decodeSolidNotes(updated.group.notes).cleanNotes : "";
      const teammates = updated.group?.swimmers
        ? updated.group.swimmers
            .filter((s) => s.swimId !== updated.swimId)
            .map((s) => {
              const parts = s.fullName.trim().split(/\s+/);
              return parts[0] || "";
            })
            .filter(Boolean)
        : [];

      const groupMembers = updated.group?.swimmers
        ? updated.group.swimmers.map((s, idx) => ({
            num: idx + 1,
            id: s.id,
            swimId: s.swimId,
            fullName: s.fullName,
            groupStatus: s.groupStatus,
            isCurrentMember: s.swimId === updated.swimId,
          }))
        : [];

      return NextResponse.json(
        {
          success: true,
          member: {
            ...updated,
            isSolid,
            solidNotes,
            teammates,
            groupMembers,
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
