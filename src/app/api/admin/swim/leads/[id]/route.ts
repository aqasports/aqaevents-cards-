import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, notes, formula, duration, frequency, category, level } = body;

    const lead = await prisma.swimLead.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(formula && { formula }),
        ...(duration && { duration }),
        ...(frequency && { frequency }),
        ...(category && { category }),
        ...(level && { level }),
      },
    });

    return NextResponse.json(lead);
  } catch (err: unknown) {
    logger.error("PATCH admin swim lead error:", err);
    return NextResponse.json({ error: "Failed to update swim lead" }, { status: 500 });
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
    await prisma.swimLead.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE admin swim lead error:", err);
    return NextResponse.json({ error: "Failed to delete swim lead" }, { status: 500 });
  }
}
