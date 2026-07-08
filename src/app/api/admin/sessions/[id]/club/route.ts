import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignClubSchema = z.object({
  clubId: z.string().nullable(), // null to unassign
});

// PATCH /api/admin/sessions/[id]/club
// Assign or unassign a club from a session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = assignClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const session = await prisma.activitySession.update({
      where: { id },
      data: { clubId: parsed.data.clubId },
      include: {
        club: true,
        activity: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(session);
  } catch (err) {
    console.error("PATCH session club error:", err);
    return NextResponse.json({ error: "Failed to assign club to session" }, { status: 500 });
  }
}
