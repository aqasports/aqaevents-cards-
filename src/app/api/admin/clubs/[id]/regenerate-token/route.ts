import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateClubTerminalToken } from "@/lib/tokens";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const newToken = generateClubTerminalToken();
    const club = await prisma.club.update({
      where: { id },
      data: { terminalToken: newToken },
    });

    return NextResponse.json({ success: true, terminalToken: club.terminalToken });
  } catch (err) {
    console.error("POST regenerate club token error:", err);
    return NextResponse.json({ error: "Failed to regenerate club token" }, { status: 500 });
  }
}
