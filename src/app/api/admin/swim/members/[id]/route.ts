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
    const member = await prisma.swimMember.findUnique({
      where: { id },
      include: {
        group: true,
        card: true,
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
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
    } = body;

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
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        group: true,
        card: true,
        payments: true,
      },
    });

    return NextResponse.json(updated);
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
