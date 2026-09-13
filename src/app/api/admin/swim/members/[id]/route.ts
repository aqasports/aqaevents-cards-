import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    // Support lookup by swimId (SWM-XXXXXX) or internal DB id
    const isSwimlId = id.toUpperCase().startsWith("SWM-");
    const member = isSwimlId
      ? await prisma.swimMember.findFirst({
          where: { swimId: id.toUpperCase() },
          include: {
            group: true,
            card: true,
            payments: { orderBy: { paidAt: "desc" } },
          },
        })
      : await prisma.swimMember.findUnique({
          where: { id },
          include: {
            group: true,
            card: true,
            payments: { orderBy: { paidAt: "desc" } },
          },
        });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Archived group logic: if group is inactive, treat as unassigned
    const effectivelyUnassigned = !!(member.groupId && member.group && !member.group.active);
    const effectiveGroup = effectivelyUnassigned ? null : member.group;

    return NextResponse.json({
      ...member,
      effectiveGroup,
      effectivelyUnassigned,
    });
  } catch (err: unknown) {
    logger.error("GET admin swim member detail error:", err);
    return NextResponse.json({ error: "Failed to fetch member detail" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

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
      priceDA,
      coachMessage,
      paymentStatus,
      groupStatus,
      rejectionReason,
      notes,
      whatsapp,
    } = body;

    // Validate groupId update: category must match and group must be active
    if (groupId !== undefined && groupId !== null) {
      const targetGroup = await prisma.swimGroup.findUnique({ where: { id: groupId } });
      if (!targetGroup) {
        return NextResponse.json({ error: "Target group not found" }, { status: 404 });
      }
      if (!targetGroup.active) {
        return NextResponse.json({ error: "Cannot assign to an archived group" }, { status: 400 });
      }
      // Get current member category to validate
      const currentMember = await prisma.swimMember.findUnique({ where: { id }, select: { category: true } });
      const memberCategory = category || currentMember?.category;
      if (targetGroup.category !== memberCategory) {
        return NextResponse.json(
          { error: "Group category does not match member category" },
          { status: 400 }
        );
      }
    }

    // Build notes with optional whatsapp
    let updatedNotes: string | null | undefined = undefined;
    if (notes !== undefined || whatsapp !== undefined) {
      const currentMember = await prisma.swimMember.findUnique({ where: { id }, select: { notes: true } });
      let currentNotesVal = notes !== undefined ? (notes?.trim() || null) : currentMember?.notes ?? null;
      if (whatsapp !== undefined) {
        const wa = whatsapp?.trim();
        if (wa) {
          if (!currentNotesVal) {
            currentNotesVal = `WhatsApp: ${wa}`;
          } else if (/(?:whatsapp|wa)\s*[:=]\s*[+0-9\s().-]+/i.test(currentNotesVal)) {
            currentNotesVal = currentNotesVal.replace(
              /(?:whatsapp|wa)\s*[:=]\s*[+0-9\s().-]+/i,
              `WhatsApp: ${wa}`
            );
          } else {
            currentNotesVal = `${currentNotesVal} | WhatsApp: ${wa}`;
          }
        }
      }
      updatedNotes = currentNotesVal;
    }

    const updated = await prisma.swimMember.update({
      where: { id },
      data: {
        ...(fullName && { fullName: fullName.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || "" }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl?.trim() || null }),
        ...(dateOfStart && { dateOfStart: new Date(dateOfStart) }),
        ...(category && { category }),
        ...(level && { level }),
        ...(groupId !== undefined && { groupId: groupId || null }),
        ...(formula && { formula }),
        ...(duration && { duration }),
        ...(priceDA !== undefined && { priceDA: parseInt(priceDA, 10) }),
        ...(coachMessage !== undefined && { coachMessage: coachMessage?.trim() || null }),
        ...(paymentStatus && { paymentStatus }),
        ...(groupStatus && { groupStatus }),
        ...(rejectionReason !== undefined && { rejectionReason }),
        ...(updatedNotes !== undefined && { notes: updatedNotes }),
      },
      include: {
        group: true,
        card: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    });

    const effectivelyUnassigned = !!(updated.groupId && updated.group && !updated.group.active);
    const effectiveGroup = effectivelyUnassigned ? null : updated.group;

    return NextResponse.json({ ...updated, effectiveGroup, effectivelyUnassigned });
  } catch (err: unknown) {
    logger.error("PATCH admin swim member error:", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    await prisma.swimMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE admin swim member error:", err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
