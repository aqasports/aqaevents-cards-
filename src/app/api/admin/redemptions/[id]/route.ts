import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { syncClientCRM } from "@/lib/crm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const redemption = await prisma.redemption.findUnique({
      where: { id },
    });

    if (!redemption) {
      return NextResponse.json({ error: "Redemption not found" }, { status: 404 });
    }

    // Delete redemption. SQLite will cascade delete the linked LedgerEntry.
    await prisma.redemption.delete({
      where: { id },
    });

    await syncClientCRM(redemption.clientId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete redemption database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during redemption deletion: ${details}` },
      { status: 500 },
    );
  }
}
