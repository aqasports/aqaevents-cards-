import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(packages, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("GET public packages API error:", err);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}
