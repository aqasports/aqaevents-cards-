import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activityId");

  try {
    const checkIns = await prisma.checkIn.findMany({
      where: {
        clubId: id,
        status: "SUCCESS",
        ...(activityId ? { activityId } : {}),
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
          },
        },
        session: {
          select: {
            id: true,
            sessionDate: true,
            location: true,
          },
        },
      },
      orderBy: { scannedAt: "desc" },
    });

    return NextResponse.json(checkIns);
  } catch (err) {
    console.error("GET club check-ins error:", err);
    return NextResponse.json({ error: "Failed to fetch club check-ins" }, { status: 500 });
  }
}
