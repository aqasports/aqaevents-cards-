import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimId, generateSwimToken, generateSwimCardCode } from "@/lib/swim-id";
import {
  calculateSwimPrice,
  resolveMultiGroupFormula,
  SwimCategory,
  SwimDuration,
  SwimFrequency,
} from "@/lib/swim-pricing";
import { parseSwimLeadNotes } from "@/lib/swim-lead-details";
import { encodeMemberGroupIds } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      leadId,
      groupId,
      groupIds,
      coachMessage,
      priceDA,
      issueCard,
      cardCode,
      notes,
    } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const lead = await prisma.swimLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadDetails = parseSwimLeadNotes(lead.notes);

    // Resolve target group IDs from body or lead demographics
    let targetGroupIds: string[] = [];
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      targetGroupIds = Array.from(
        new Set(groupIds.map((g: unknown) => String(g).trim()).filter(Boolean))
      );
    } else if (groupId && String(groupId).trim()) {
      targetGroupIds = [String(groupId).trim()];
    } else if ((leadDetails.demographics.selectedGroupIds?.length ?? 0) > 0) {
      targetGroupIds = leadDetails.demographics.selectedGroupIds || [];
    }

    const targetGroups =
      targetGroupIds.length > 0
        ? await prisma.swimGroup.findMany({
            where: { id: { in: targetGroupIds } },
          })
        : [];

    // Preserve selection order
    const orderedTargetGroups = targetGroupIds
      .map((id) => targetGroups.find((g) => g.id === id))
      .filter((g): g is NonNullable<typeof g> => Boolean(g));

    const validTargetGroupIds = orderedTargetGroups.map((g) => g.id);

    const category = (lead.category || "homme") as SwimCategory;
    const duration = (lead.duration || "3m") as SwimDuration;
    const frequency = (lead.frequency || "1x") as SwimFrequency;

    let formula = lead.formula || "G10";
    if (orderedTargetGroups.length > 0) {
      const resolved = resolveMultiGroupFormula(
        orderedTargetGroups.map((g) => g.level)
      );
      formula = resolved.formula;
    }

    const finalPrice =
      priceDA ??
      leadDetails.demographics.priceDA ??
      (orderedTargetGroups.length > 0
        ? calculateSwimPrice({
            category,
            groupTypes: orderedTargetGroups.map((g) => g.level),
            duration,
          })
        : calculateSwimPrice(category, formula, duration, frequency));

    // Check if this lead belongs to an existing SwimMember (Old Member flow)
    let existingMember = null;
    if (leadDetails.demographics.memberId) {
      existingMember = await prisma.swimMember.findUnique({
        where: { id: leadDetails.demographics.memberId },
        include: { card: true },
      });
    }
    if (!existingMember && leadDetails.demographics.personalId) {
      const cleanUpper = leadDetails.demographics.personalId.trim().toUpperCase();
      existingMember = await prisma.swimMember.findFirst({
        where: {
          OR: [
            { swimId: { equals: cleanUpper, mode: "insensitive" } },
            ...(cleanUpper.length >= 4
              ? [{ swimId: { endsWith: cleanUpper, mode: "insensitive" as const } }]
              : []),
          ],
        },
        include: { card: true },
      });
    }

    if (existingMember) {
      const primaryGroupId =
        validTargetGroupIds[0] || existingMember.groupId || null;
      const updatedNotes =
        validTargetGroupIds.length > 0
          ? encodeMemberGroupIds(existingMember.notes, validTargetGroupIds)
          : existingMember.notes;

      const updatedMember = await prisma.swimMember.update({
        where: { id: existingMember.id },
        data: {
          groupId: primaryGroupId,
          notes: updatedNotes,
          formula,
          duration,
          priceDA: finalPrice,
          groupStatus:
            validTargetGroupIds.length > 0
              ? "accepted"
              : existingMember.groupStatus,
          ...(coachMessage !== undefined
            ? { coachMessage: coachMessage || null }
            : {}),
        },
      });

      if (issueCard && !existingMember.card) {
        const token = generateSwimToken();
        const code = cardCode?.trim()
          ? cardCode.trim().toUpperCase()
          : generateSwimCardCode();

        await prisma.swimCard.create({
          data: {
            memberId: updatedMember.id,
            publicToken: token,
            cardCode: code,
            status: "active",
          },
        });
      }

      await prisma.swimLead.update({
        where: { id: leadId },
        data: { status: "confirmed" },
      });

      return NextResponse.json(
        {
          member: updatedMember,
          swimId: updatedMember.swimId,
          updatedExisting: true,
        },
        { status: 200 }
      );
    }

    // Generate unique swimId for new member
    let swimId = generateSwimId();
    let collisionCheck = await prisma.swimMember.findUnique({ where: { swimId } });
    while (collisionCheck) {
      swimId = generateSwimId();
      collisionCheck = await prisma.swimMember.findUnique({ where: { swimId } });
    }

    const baseNotes = notes !== undefined ? notes : lead.notes || null;
    const finalNotes =
      validTargetGroupIds.length > 0
        ? encodeMemberGroupIds(baseNotes, validTargetGroupIds)
        : baseNotes;

    // Create member
    const member = await prisma.swimMember.create({
      data: {
        swimId,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        dateOfStart: new Date(),
        category,
        level: lead.level || "beginner",
        groupId: validTargetGroupIds[0] || null,
        formula,
        duration,
        priceDA: finalPrice,
        coachMessage: coachMessage || null,
        paymentStatus: "unpaid",
        groupStatus: validTargetGroupIds.length > 0 ? "accepted" : "proposed",
        notes: finalNotes,
      },
    });

    // Optionally link or create card
    if (issueCard) {
      const token = generateSwimToken();
      const code = cardCode?.trim() ? cardCode.trim().toUpperCase() : generateSwimCardCode();

      await prisma.swimCard.create({
        data: {
          memberId: member.id,
          publicToken: token,
          cardCode: code,
          status: "active",
        },
      });
    }

    // Update lead status to confirmed
    await prisma.swimLead.update({
      where: { id: leadId },
      data: { status: "confirmed" },
    });

    return NextResponse.json({ member, swimId, updatedExisting: false }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST promote swim lead error:", err);
    return NextResponse.json({ error: "Failed to promote lead to member" }, { status: 500 });
  }
}
