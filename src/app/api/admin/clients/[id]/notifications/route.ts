import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const logs = await prisma.notificationLog.findMany({
      where: { clientId: id },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (err) {
    console.error("Fetch client notification logs error:", err);
    return NextResponse.json({ error: "Failed to fetch notification logs" }, { status: 500 });
  }
}
