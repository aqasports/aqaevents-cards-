import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseSwimLeadNotes, formatSwimLeadNotes } from "@/lib/swim-lead-details";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const lead = await prisma.swimLead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      details: parseSwimLeadNotes(lead.notes),
    });
  } catch (err: unknown) {
    logger.error("GET admin swim lead error:", err);
    return NextResponse.json({ error: "Failed to fetch swim lead" }, { status: 500 });
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
    const { status, notes, formula, duration, frequency, category, level, details } = body;

    let computedNotes = notes;
    if (details) {
      computedNotes = formatSwimLeadNotes({
        equipment: details.equipment,
        demographics: details.demographics,
        userNotes: details.userNotes ?? notes,
      });
    }

    const lead = await prisma.swimLead.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(computedNotes !== undefined && { notes: computedNotes }),
        ...(formula && { formula }),
        ...(duration && { duration }),
        ...(frequency && { frequency }),
        ...(category && { category }),
        ...(level && { level }),
      },
    });

    return NextResponse.json({
      ...lead,
      details: parseSwimLeadNotes(lead.notes),
    });
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
