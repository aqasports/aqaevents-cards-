import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(activities, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("GET public activities API error:", err);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
