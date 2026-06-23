import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const credits = await prisma.ledgerEntry.findMany({
      where: {
        type: "credit",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        delta: true,
        createdAt: true,
      },
    });

    const redemptions = await prisma.redemption.findMany({
      where: {
        redeemedAt: { gte: thirtyDaysAgo },
      },
      select: {
        creditsUsed: true,
        redeemedAt: true,
      },
    });

    // Process and aggregate by day
    const dataByDate: Record<string, { date: string; sales: number; redemptions: number }> = {};

    // Initialize the last 30 days with 0 values
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dataByDate[dateStr] = { date: dateStr, sales: 0, redemptions: 0 };
    }

    for (const c of credits) {
      const dateStr = c.createdAt.toISOString().split("T")[0];
      if (dataByDate[dateStr]) {
        dataByDate[dateStr].sales += c.delta;
      }
    }

    for (const r of redemptions) {
      const dateStr = r.redeemedAt.toISOString().split("T")[0];
      if (dataByDate[dateStr]) {
        dataByDate[dateStr].redemptions += r.creditsUsed;
      }
    }

    // Sort chronologically
    const analytics = Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(analytics);
  } catch (err) {
    console.error("Fetch analytics data error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
