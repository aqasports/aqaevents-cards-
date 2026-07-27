import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCreditRate } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    const creditRate = await getCreditRate();

    return NextResponse.json(packages, {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Expose-Headers": "X-Credit-Rate",
        "X-Credit-Rate": creditRate.toString(),
      },
    });
  } catch (err: unknown) {
    console.error("GET public packages API error:", err);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Expose-Headers": "X-Credit-Rate",
    },
  });
}
