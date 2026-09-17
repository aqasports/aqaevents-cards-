import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  calculateSubscriptionExpiration,
  SwimCallEntry,
} from "@/lib/swim-calls";
import {
  getStoredCallRecords,
  saveStoredCallRecords,
} from "@/lib/swim-calls-server";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      memberId,
      formula,
      duration,
      groupId,
      priceDA,
      dateOfStart,
      notes,
    } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const member = await prisma.swimMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Swimmer member not found" }, { status: 404 });
    }

    const newStart = dateOfStart ? new Date(dateOfStart) : new Date();
    const newFormula = formula || member.formula;
    const newDuration = duration || member.duration || "3m";
    const newPrice = priceDA !== undefined ? parseInt(priceDA, 10) : member.priceDA;
    const callerName = session.user?.name || session.user?.email || "Staff";

    const dateFormatted = newStart.toLocaleDateString("en-GB");
    const reinscriptionNote = `[Reinscription Confirmed on ${dateFormatted} by ${callerName}]: Formula ${newFormula}, Duration ${newDuration}${notes ? ` | Note: ${notes}` : ""}`;
    const updatedNotes = member.notes ? `${member.notes}\n${reinscriptionNote}` : reinscriptionNote;

    // Update SwimMember
    const updatedMember = await prisma.swimMember.update({
      where: { id: memberId },
      data: {
        dateOfStart: newStart,
        formula: newFormula,
        duration: newDuration,
        priceDA: newPrice,
        groupId: groupId !== undefined ? groupId : member.groupId,
        groupStatus: groupId ? "proposed" : member.groupStatus,
        paymentStatus: "unpaid",
        notes: updatedNotes,
      },
    });

    // Update call records in PlatformSetting
    const records = await getStoredCallRecords();
    const record = records[memberId] || {
      id: member.id,
      entityType: "member",
      entityId: member.id,
      swimId: member.swimId,
      fullName: member.fullName,
      phone: member.phone,
      email: member.email,
      category: member.category,
      level: member.level,
      formula: newFormula,
      duration: newDuration,
      dateOfStart: newStart.toISOString(),
      expirationDate: calculateSubscriptionExpiration(newStart, newDuration).toISOString(),
      status: "reinscribed",
      reinscriptionIntent: "high",
      callHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const callEntry: SwimCallEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      callerName,
      outcome: "answered_reinscribed",
      observation: `Reinscription confirmed for formula ${newFormula} (${newDuration}).`,
      reinscriptionIntent: "high",
      callbackDate: null,
      calledAt: new Date().toISOString(),
    };

    record.status = "reinscribed";
    record.formula = newFormula;
    record.duration = newDuration;
    record.dateOfStart = newStart.toISOString();
    record.expirationDate = calculateSubscriptionExpiration(newStart, newDuration).toISOString();
    record.lastOutcome = "answered_reinscribed";
    record.lastObservation = `Reinscription confirmed for formula ${newFormula} (${newDuration}).`;
    record.callbackDate = null;
    record.callHistory = [callEntry, ...(record.callHistory || [])];
    record.updatedAt = new Date().toISOString();

    records[memberId] = record;
    await saveStoredCallRecords(records);

    await logAdminAction(
      session.user?.id || null,
      "SWIM_REINSCRIPTION_CONFIRMED",
      `Swimmer:${member.fullName} (${member.swimId})`,
      JSON.stringify({ formula: newFormula, duration: newDuration, priceDA: newPrice })
    );

    return NextResponse.json({ success: true, member: updatedMember, record });
  } catch (err: unknown) {
    logger.error("POST admin swim reinscribe error:", err);
    return NextResponse.json({ error: "Failed to confirm reinscription" }, { status: 500 });
  }
}
