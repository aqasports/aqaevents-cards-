import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { BillingService } from "@/modules/invoices/service";

const activitiesService = new ActivitiesService();
const billingService = new BillingService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  
  const searchParams = request.nextUrl.searchParams;
  const hard = searchParams.get("hard") === "true";

  try {
    // Soft-delete (cancel): auto bulk-refund all registered clients first
    if (!hard) {
      await billingService.bulkRefundSession(id, session.user.id);
    }

    const result = await activitiesService.deleteSession(id, hard);
    return NextResponse.json(hard ? { deleted: true, session: result } : result);
  } catch (err: unknown) {
    console.error("DELETE session API error:", err);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

