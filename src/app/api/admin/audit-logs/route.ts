import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (err) {
    console.error("Fetch audit logs error:", err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
