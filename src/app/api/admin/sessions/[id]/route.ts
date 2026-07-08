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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();

  try {
    const result = await activitiesService.updateSession(id, {
      location: body.location !== undefined ? body.location : undefined,
      capacity: body.capacity !== undefined ? body.capacity : undefined,
      clubId: body.clubId !== undefined ? body.clubId : undefined,
      sessionDate: body.sessionDate ? new Date(body.sessionDate) : undefined,
      active: body.active !== undefined ? body.active : undefined,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("PATCH session API error:", err);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

