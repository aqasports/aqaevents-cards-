import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: sessionId } = await params;

  try {
    const waitlists = await prisma.sessionWaitlist.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json(waitlists);
  } catch (err: unknown) {
    console.error("GET admin session waitlist error:", err);
    return NextResponse.json(
      { error: "Failed to fetch session waitlist" },
      { status: 500 }
    );
  }
}
