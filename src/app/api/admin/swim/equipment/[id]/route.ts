import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.swimEquipmentSale.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.swimEquipmentSale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE swim equipment sale error:", err);
    return NextResponse.json(
      { error: "Failed to delete equipment sale" },
      { status: 500 }
    );
  }
}
