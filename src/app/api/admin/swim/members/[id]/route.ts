import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateSwimPrice, resolveMultiGroupFormula } from "@/lib/swim-pricing";
import { logAdminAction } from "@/lib/audit";
import { getStoredCallRecords, saveStoredCallRecords } from "@/lib/swim-calls-server";
import {
  decodeMemberGroupIds,
  encodeMemberGroupIds,
  parseDebtFromNotes,
  encodeDebtInNotes,
  getMemberPaymentSituation,
} from "@/lib/swim-groups";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
  subscriptionDaysLeft,
  getSubscriptionStatus,
} from "@/lib/swim-subscription";
import { recordSwimmerGroupChangeNotification } from "@/lib/swim-coach-notifications";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    // Support lookup by swimId (SWM-XXXXXX), card.cardCode (SWM-XXXXXX), or internal DB id
    const upperId = id.trim().toUpperCase();
    const isSwimlId = upperId.startsWith("SWM-");
    const member = isSwimlId
      ? await prisma.swimMember.findFirst({
          where: {
            OR: [
              { swimId: { equals: upperId, mode: "insensitive" } },
              { card: { cardCode: { equals: upperId, mode: "insensitive" } } },
            ],
          },
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

    // Decode all assigned groups for this member (multi-group support)
    const allGroupIds = decodeMemberGroupIds(member.notes, member.groupId);
    let allGroups: Array<{ id: string; active?: boolean; [key: string]: any }> = [];
    if (allGroupIds.length > 0) {
      allGroups = await prisma.swimGroup.findMany({
        where: { id: { in: allGroupIds } },
        include: {
          _count: { select: { swimmers: true } },
        },
      });
      allGroups.sort((a, b) => allGroupIds.indexOf(a.id) - allGroupIds.indexOf(b.id));
    } else if (member.group) {
      allGroups = [member.group];
    }

    const effectiveGroups = allGroups.filter((g) => g.active);
    const effectivelyUnassigned = effectiveGroups.length === 0;
    const effectiveGroup = effectiveGroups[0] || null;

    const paymentSituation = getMemberPaymentSituation({
      ...member,
      effectiveGroup,
      effectivelyUnassigned,
      groups: effectiveGroups,
    });

    const subStart = member.subscriptionStart
      ? member.subscriptionStart
      : getEffectiveSubscriptionStart(member.dateOfStart);
    const subEnd = member.subscriptionEnd
      ? member.subscriptionEnd
      : computeSubscriptionEnd(subStart, member.duration, undefined, member.formula);
    const daysLeft = subscriptionDaysLeft(subEnd);
    const subStatus = getSubscriptionStatus(subEnd);

    return NextResponse.json({
      ...member,
      groups: allGroups,
      effectiveGroups,
      groupIds: allGroupIds,
      effectiveGroup,
      effectivelyUnassigned,
      paymentSituation,
      isAssigned: paymentSituation.isAssigned,
      isLinkedToPayment: paymentSituation.isLinkedToPayment,
      isDebtOnly: paymentSituation.isDebtOnly,
      debtDetails: paymentSituation.debtDetails,
      subscriptionStart: subStart,
      subscriptionEnd: subEnd,
      subscriptionDaysLeft: daysLeft,
      subscriptionStatus: subStatus,
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
      groupIds,
      formula,
      duration,
      priceDA,
      coachMessage,
      paymentStatus,
      groupStatus,
      rejectionReason,
      notes,
      whatsapp,
      subscriptionStart: rawSubscriptionStart,
      subscriptionEnd: rawSubscriptionEnd,
      debtAmount,
      debtReason,
      addDebt,
    } = body;

    // Handle groupIds (multi-group array) or legacy groupId
    let effectivePrimaryGroupId: string | null | undefined = undefined;
    let targetMultiGroupIds: string[] | undefined = undefined;

    if (groupIds !== undefined) {
      targetMultiGroupIds = Array.isArray(groupIds)
        ? Array.from(new Set(groupIds.filter(Boolean) as string[]))
        : [];
      effectivePrimaryGroupId = targetMultiGroupIds[0] || null;
    } else if (groupId !== undefined) {
      effectivePrimaryGroupId = groupId || null;
      targetMultiGroupIds = groupId ? [groupId] : [];
    }

    // Validate target groups
    let targetGroupsList: { id: string; name: string; level: string; active: boolean; category: string }[] = [];
    if (targetMultiGroupIds && targetMultiGroupIds.length > 0) {
      targetGroupsList = await prisma.swimGroup.findMany({
        where: { id: { in: targetMultiGroupIds } },
        select: { id: true, name: true, level: true, active: true, category: true },
      });

      if (targetGroupsList.length !== targetMultiGroupIds.length) {
        return NextResponse.json({ error: "One or more target groups not found" }, { status: 404 });
      }

      const currentMember = await prisma.swimMember.findUnique({ where: { id }, select: { category: true } });
      const memberCategory = category || currentMember?.category;

      for (const tg of targetGroupsList) {
        if (!tg.active) {
          return NextResponse.json({ error: `Group "${tg.name}" is archived` }, { status: 400 });
        }
        if (tg.category !== memberCategory) {
          return NextResponse.json(
            { error: `Group "${tg.name}" category does not match member category` },
            { status: 400 }
          );
        }
      }
    }

    // Build notes with optional whatsapp and multi-group tag
    let updatedNotes: string | null | undefined = undefined;
    if (notes !== undefined || whatsapp !== undefined || targetMultiGroupIds !== undefined) {
      const currentMember = await prisma.swimMember.findUnique({
        where: { id },
        select: { notes: true, groupId: true },
      });
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
      if (targetMultiGroupIds !== undefined) {
        currentNotesVal = encodeMemberGroupIds(currentNotesVal, targetMultiGroupIds);
      } else {
        const activeIds = decodeMemberGroupIds(currentMember?.notes, currentMember?.groupId);
        currentNotesVal = encodeMemberGroupIds(currentNotesVal, activeIds);
      }
      updatedNotes = currentNotesVal;
    }

    // Auto-calculate formula and official AQA tariff when groups/duration change without explicit priceDA
    let finalFormula = formula;
    let finalDuration = duration;
    let finalPriceDA = priceDA !== undefined ? parseInt(priceDA, 10) : undefined;

    // Handle explicit debt (ancien unsettled payment)
    const effectiveDebtInput = debtAmount !== undefined
      ? parseInt(debtAmount, 10)
      : addDebt !== undefined
      ? parseInt(addDebt, 10)
      : undefined;

    if (effectiveDebtInput !== undefined && !isNaN(effectiveDebtInput)) {
      finalPriceDA = Math.max(0, effectiveDebtInput);
      const currentMemberNotes = updatedNotes !== undefined
        ? updatedNotes
        : (await prisma.swimMember.findUnique({ where: { id }, select: { notes: true } }))?.notes;
      updatedNotes = encodeDebtInNotes(currentMemberNotes, finalPriceDA, debtReason || "Ancien impaye");

      await logAdminAction(
        session.user?.id || null,
        "ADD_SWIM_DEBT",
        `Member ${id}`,
        `Recorded debt of ${finalPriceDA} DA. Reason: ${debtReason || "Ancien impaye"}`
      );
    }

    if (targetMultiGroupIds !== undefined && targetMultiGroupIds.length > 0) {
      const groupLevels = targetGroupsList.map((g) => g.level);
      const resolved = resolveMultiGroupFormula(groupLevels);
      if (!finalFormula) {
        finalFormula = resolved.formula;
      }
      if (finalPriceDA === undefined) {
        const effCat = category || (await prisma.swimMember.findUnique({ where: { id }, select: { category: true } }))?.category || "homme";
        const effDur = duration || (await prisma.swimMember.findUnique({ where: { id }, select: { duration: true } }))?.duration || "3m";
        finalPriceDA = calculateSwimPrice({
          category: effCat,
          groupTypes: groupLevels,
          duration: effDur,
        });
      }
    } else if (
      (targetMultiGroupIds !== undefined && targetMultiGroupIds.length === 0) ||
      (effectivePrimaryGroupId === null && (targetMultiGroupIds === undefined || targetMultiGroupIds.length === 0))
    ) {
      // Swimmer was unassigned from all groups.
      // Rule: Non-assigned clients are NOT automatically linked to payment situation unless explicit debt is set.
      // Rule: Never give a formula or tier for non-assigned client (to a group).
      finalFormula = "";
      finalDuration = null;
      const current = await prisma.swimMember.findUnique({
        where: { id },
        select: { notes: true },
      });
      const parsedDebt = parseDebtFromNotes(current?.notes);
      if (finalPriceDA === undefined && !parsedDebt.hasDebt) {
        finalPriceDA = 0;
      }
    } else if (finalPriceDA === undefined && (groupId !== undefined || formula !== undefined || duration !== undefined)) {
      const current = await prisma.swimMember.findUnique({
        where: { id },
        include: { group: true },
      });
      if (current) {
        const targetGroupId = effectivePrimaryGroupId !== undefined ? effectivePrimaryGroupId : current.groupId;
        // ONLY calculate autoPrice if targetGroupId actually exists (assigned to a group)!
        if (targetGroupId) {
          const g = await prisma.swimGroup.findUnique({ where: { id: targetGroupId } });
          if (g && g.active) {
            const groupLevel = g.level;
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

    // Recompute subscription dates if subscriptionStart, subscriptionEnd or duration changed
    let computedSubStart: Date | undefined = undefined;
    let computedSubEnd: Date | undefined = undefined;
    if (rawSubscriptionStart !== undefined || rawSubscriptionEnd !== undefined || duration !== undefined) {
      const currentMemberForSub = await prisma.swimMember.findUnique({
        where: { id },
        select: { dateOfStart: true, duration: true, formula: true, subscriptionStart: true, subscriptionEnd: true },
      });
      const baseStart = rawSubscriptionStart !== undefined
        ? (rawSubscriptionStart ? new Date(rawSubscriptionStart) : null)
        : (currentMemberForSub?.subscriptionStart ?? currentMemberForSub?.dateOfStart ?? new Date());
      const baseDuration = duration || currentMemberForSub?.duration || "3m";

      if (rawSubscriptionStart !== undefined) {
        computedSubStart = baseStart ? getEffectiveSubscriptionStart(baseStart) : undefined;
      }

      if (rawSubscriptionEnd !== undefined) {
        // Explicit manual override by admin
        computedSubEnd = rawSubscriptionEnd ? new Date(rawSubscriptionEnd) : undefined;
      } else if (computedSubStart !== undefined || duration !== undefined) {
        // System automatically calculates end date
        const effectiveStartForEnd = computedSubStart || getEffectiveSubscriptionStart(currentMemberForSub?.subscriptionStart ?? currentMemberForSub?.dateOfStart);
        computedSubEnd = computeSubscriptionEnd(
          effectiveStartForEnd,
          baseDuration,
          undefined,
          formula ?? currentMemberForSub?.formula
        );
      }
    }

    const beforeUpdateMember = await prisma.swimMember.findUnique({
      where: { id },
      select: { groupId: true, notes: true },
    });
    const previousGroupIds = beforeUpdateMember
      ? decodeMemberGroupIds(beforeUpdateMember.notes, beforeUpdateMember.groupId)
      : [];

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
        ...((effectivePrimaryGroupId !== undefined || groupId !== undefined) && {
          groupId: effectivePrimaryGroupId !== undefined ? effectivePrimaryGroupId : (groupId || null),
        }),
        ...(finalFormula !== undefined
          ? { formula: finalFormula }
          : formula !== undefined
          ? { formula: formula }
          : {}),
        ...(finalDuration !== undefined
          ? { duration: finalDuration || null }
          : duration !== undefined
          ? { duration: duration || null }
          : {}),
        ...(finalPriceDA !== undefined && { priceDA: finalPriceDA }),
        ...(coachMessage !== undefined && { coachMessage: coachMessage?.trim() || null }),
        ...((paymentStatus || autoPaymentStatus) && { paymentStatus: paymentStatus || autoPaymentStatus }),
        ...(groupStatus && { groupStatus }),
        ...(rejectionReason !== undefined && { rejectionReason }),
        ...(updatedNotes !== undefined && { notes: updatedNotes }),
        ...(computedSubStart !== undefined && { subscriptionStart: computedSubStart }),
        ...(computedSubEnd !== undefined && { subscriptionEnd: computedSubEnd }),
      },
      include: {
        group: true,
        card: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    });

    const allGroupIds = decodeMemberGroupIds(updated.notes, updated.groupId);
    if (groupIds !== undefined || groupId !== undefined) {
      await recordSwimmerGroupChangeNotification({
        memberId: updated.id,
        memberName: updated.fullName,
        swimId: updated.swimId,
        previousGroupIds,
        nextGroupIds: allGroupIds,
        isNewlyCreatedMember: false,
        adminId: session.user?.id || null,
      });
    }
    let allGroups: Array<{ id: string; active?: boolean; [key: string]: any }> = [];
    if (allGroupIds.length > 0) {
      allGroups = await prisma.swimGroup.findMany({
        where: { id: { in: allGroupIds } },
        include: {
          _count: { select: { swimmers: true } },
        },
      });
      allGroups.sort((a, b) => allGroupIds.indexOf(a.id) - allGroupIds.indexOf(b.id));
    } else if (updated.group) {
      allGroups = [updated.group];
    }

    const effectiveGroups = allGroups.filter((g) => g.active);
    const effectivelyUnassigned = effectiveGroups.length === 0;
    const effectiveGroup = effectiveGroups[0] || null;

    const paymentSituation = getMemberPaymentSituation({
      ...updated,
      effectiveGroup,
      effectivelyUnassigned,
      groups: effectiveGroups,
    });

    const subStart = updated.subscriptionStart
      ? updated.subscriptionStart
      : getEffectiveSubscriptionStart(updated.dateOfStart);
    const subEnd = updated.subscriptionEnd
      ? updated.subscriptionEnd
      : computeSubscriptionEnd(subStart, updated.duration, undefined, updated.formula);
    const daysLeft = subscriptionDaysLeft(subEnd);
    const subStatus = getSubscriptionStatus(subEnd);

    return NextResponse.json({
      ...updated,
      groups: allGroups,
      effectiveGroups,
      groupIds: allGroupIds,
      effectiveGroup,
      effectivelyUnassigned,
      paymentSituation,
      isAssigned: paymentSituation.isAssigned,
      isLinkedToPayment: paymentSituation.isLinkedToPayment,
      isDebtOnly: paymentSituation.isDebtOnly,
      debtDetails: paymentSituation.debtDetails,
      subscriptionStart: subStart,
      subscriptionEnd: subEnd,
      subscriptionDaysLeft: daysLeft,
      subscriptionStatus: subStatus,
    });
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
