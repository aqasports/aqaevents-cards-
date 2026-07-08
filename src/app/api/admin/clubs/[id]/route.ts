import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateClubSchema = z.object({
  name: z.string().min(2).optional(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().or(z.literal("")).optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        activities: {
          select: { id: true, name: true, active: true },
        },
        _count: { select: { checkIns: true } },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json(club);
  } catch (err) {
    console.error("GET club error:", err);
    return NextResponse.json({ error: "Failed to fetch club" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const club = await prisma.club.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.contactName !== undefined && { contactName: parsed.data.contactName }),
        ...(parsed.data.contactEmail !== undefined && { contactEmail: parsed.data.contactEmail || null }),
        ...(parsed.data.contactPhone !== undefined && { contactPhone: parsed.data.contactPhone }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    });
    return NextResponse.json(club);
  } catch (err) {
    console.error("PATCH club error:", err);
    return NextResponse.json({ error: "Failed to update club" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    // Check if the club has linked activities
    const activityCount = await prisma.activity.count({
      where: { clubId: id },
    });

    if (activityCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete club with linked activities. Please unlink them first." },
        { status: 409 }
      );
    }

    // Unlink sessions from this club before deleting
    await prisma.activitySession.updateMany({
      where: { clubId: id },
      data: { clubId: null },
    });

    await prisma.club.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE club error:", err);
    return NextResponse.json({ error: "Failed to delete club" }, { status: 500 });
  }
}
