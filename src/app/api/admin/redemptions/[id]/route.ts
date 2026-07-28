import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { logger } from "@/lib/logger";

const billingService = new BillingService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await billingService.deleteRedemption(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("DELETE redemption API error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete redemption.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
