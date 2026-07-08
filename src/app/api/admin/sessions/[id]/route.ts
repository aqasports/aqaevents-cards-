import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { BillingService } from "@/modules/invoices/service";
import { prisma } from "@/lib/prisma";

const activitiesService = new ActivitiesService();
const billingService = new BillingService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const session = await prisma.activitySession.findUnique({
      where: { id },
      include: {
        activity: true,
        club: true,
        redemptions: {
          include: {
            client: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
          orderBy: { redeemedAt: "desc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err: unknown) {
    console.error("GET session details API error:", err);
    return NextResponse.json({ error: "Failed to fetch session details" }, { status: 500 });
  }
}

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

