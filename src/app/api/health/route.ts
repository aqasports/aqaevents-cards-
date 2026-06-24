import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Run a very fast, cheap query to verify DB connectivity and keep the project active
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy", database: "connected" });
  } catch (error: any) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "unhealthy", error: error.message || String(error) },
      { status: 500 }
    );
  }
}
