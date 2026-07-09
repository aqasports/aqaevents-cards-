import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const sinceStr = searchParams.get("since");

  if (!sinceStr) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const sinceDate = new Date(sinceStr);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.checkIn.count({
      where: {
        status: "SUCCESS",
        scannedAt: {
          gt: sinceDate,
        },
      },
    });

    return NextResponse.json({ count });
  } catch (err: unknown) {
    console.error("GET new check-ins count API error:", err);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
