import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  
  const searchParams = request.nextUrl.searchParams;
  const hard = searchParams.get("hard") === "true";

  if (hard) {
    const session = await prisma.activitySession.delete({
      where: { id },
    });
    return NextResponse.json({ deleted: true, session });
  }

  // Soft delete — mark inactive so historical redemptions are preserved
  const session = await prisma.activitySession.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json(session);
}
