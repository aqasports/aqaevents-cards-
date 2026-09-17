import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateSwimPrice } from "@/lib/swim-pricing";
import { logAdminAction } from "@/lib/audit";
import { getStoredCallRecords, saveStoredCallRecords } from "@/lib/swim-calls";

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

    // When priceDA is provided OR when formula/duration/groupId changes without explicit priceDA,
    // auto-calculate the official AQA tariff and sync paymentStatus atomically.
    let finalPriceDA = priceDA !== undefined ? parseInt(priceDA, 10) : undefined;
    if (finalPriceDA === undefined && (groupId !== undefined || formula !== undefined || duration !== undefined)) {
      const current = await prisma.swimMember.findUnique({
        where: { id },
        include: { group: true },
      });
      if (current) {
        const targetGroupId = groupId !== undefined ? groupId : current.groupId;
        let groupLevel = current.group?.level || "G10";
        if (targetGroupId && targetGroupId !== current.groupId) {
          const g = await prisma.swimGroup.findUnique({ where: { id: targetGroupId } });
          if (g) groupLevel = g.level;
        }
        const effFormula = formula || current.formula || "G10";
        const effDuration = duration || current.duration || "3m";
        const freqMatch = effFormula.match(/^([123])x/i);
        const freq = freqMatch ? parseInt(freqMatch[1], 10) : 1;
        const autoPrice = calculateSwimPrice({
          category: category || current.category,
          groupType: groupLevel,
          duration: effDuration,
          frequency: freq,
        });
        if (autoPrice > 0) {
          finalPriceDA = autoPrice;
        }
      }
    }

    let autoPaymentStatus: string | undefined = undefined;
    if (finalPriceDA !== undefined && !paymentStatus) {
      const currentPayments = await prisma.swimPayment.findMany({
        where: { memberId: id },
        select: { amount: true },
      });
      const totalAlreadyPaid = currentPayments.reduce((s, p) => s + p.amount, 0);
      if (finalPriceDA > 0 && totalAlreadyPaid >= finalPriceDA) {
        autoPaymentStatus = "paid";
      } else if (totalAlreadyPaid > 0) {
        autoPaymentStatus = "partial";
      } else {
        autoPaymentStatus = "unpaid";
      }
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
        ...(finalPriceDA !== undefined && { priceDA: finalPriceDA }),
        ...(coachMessage !== undefined && { coachMessage: coachMessage?.trim() || null }),
        ...((paymentStatus || autoPaymentStatus) && { paymentStatus: paymentStatus || autoPaymentStatus }),
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
    const isSwimId = id.toUpperCase().startsWith("SWM-");
    const member = isSwimId
      ? await prisma.swimMember.findFirst({
          where: { swimId: id.toUpperCase() },
          select: { id: true, swimId: true, fullName: true },
        })
      : await prisma.swimMember.findUnique({
          where: { id },
          select: { id: true, swimId: true, fullName: true },
        });

    if (!member) {
      return NextResponse.json({ error: "Swimmer profile not found" }, { status: 404 });
    }

    // Unlink any card associated with this member
    await prisma.swimCard.updateMany({
      where: { memberId: member.id },
      data: { memberId: null, status: "voided" },
    });

    // Delete member (SwimPayment has onDelete: Cascade in schema)
    await prisma.swimMember.delete({
      where: { id: member.id },
    });

    // Clean up stored call records for this member if present
    try {
      const stored = await getStoredCallRecords();
      let changed = false;
      if (stored[member.id]) {
        delete stored[member.id];
        changed = true;
      }
      if (member.swimId && stored[member.swimId]) {
        delete stored[member.swimId];
        changed = true;
      }
      if (changed) {
        await saveStoredCallRecords(stored);
      }
    } catch {
      // Non-blocking cleanup
    }

    await logAdminAction(
      session.user?.id || null,
      "DELETE_SWIM_MEMBER",
      `Swimmer ${member.fullName} (${member.swimId})`,
      `Deleted swimmer profile by admin.`
    );

    return NextResponse.json({ success: true, deletedId: member.id, swimId: member.swimId });
  } catch (err: unknown) {
    logger.error("DELETE admin swim member error:", err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
