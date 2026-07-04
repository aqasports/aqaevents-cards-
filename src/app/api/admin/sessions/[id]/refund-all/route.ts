import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";

const billingService = new BillingService();

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: sessionId } = await params;

  try {
    const result = await billingService.bulkRefundSession(sessionId, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("POST bulk refund API error:", err);
    const message = err instanceof Error ? err.message : "Failed to bulk refund session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
