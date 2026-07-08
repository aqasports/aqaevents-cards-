import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateClubSchema = z.object({
  name: z.string().min(2).optional(),
  contact: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

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
      data: parsed.data,
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
