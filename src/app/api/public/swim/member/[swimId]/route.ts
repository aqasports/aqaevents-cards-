import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decodeSolidNotes } from "@/lib/swim-groups";

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

    return NextResponse.json(
      {
        ...member,
        isSolid,
        solidNotes,
        teammates,
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
        include: { group: true },
      });
      return NextResponse.json(
        { success: true, member: updated },
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
