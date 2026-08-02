import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { BillingService } from "@/modules/invoices/service";
import { orgRedemptionSchema } from "@/modules/organizations/validators";

const billingService = new BillingService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: orgId } = await params;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        clients: { select: { id: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const clientIds = org.clients.map((c) => c.id);

    const redemptions = await prisma.redemption.findMany({
      where: {
        clientId: { in: clientIds },
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true, departmentId: true },
        },
        activity: {
          select: { id: true, name: true, creditCost: true },
        },
        session: {
          select: { id: true, sessionDate: true, location: true },
        },
      },
      orderBy: { redeemedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(redemptions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch organization redemptions" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: orgId } = await params;

  try {
    const body = await req.json();
    const validated = orgRedemptionSchema.parse(body);

    const client = await prisma.client.findFirst({
      where: {
        id: validated.clientId,
        organizationId: orgId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Employee does not belong to this organization" },
        { status: 400 }
      );
    }

    // Verify activity permission if organization has restricted activities
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { allowedActivities: true, useSharedPool: true, sharedCreditPool: true },
    });

    if (org?.allowedActivities) {
      try {
        const allowedIds: string[] = JSON.parse(org.allowedActivities);
        if (allowedIds.length > 0 && !allowedIds.includes(validated.activityId)) {
          return NextResponse.json(
            { error: "This activity is not included in your organization's contract plan." },
            { status: 403 }
          );
        }
      } catch {
        // parsing fallback
      }
    }

    const redemptionResult = await billingService.createRedemption(
      validated.clientId,
      validated.activityId,
      {
        sessionId: validated.sessionId || undefined,
        notes: validated.notes ? `[B2B Org Redeem] ${validated.notes}` : "[B2B Org Redeem]",
        creditsUsed: validated.creditsUsed,
      },
      session.user.id
    );

    return NextResponse.json(redemptionResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to redeem activity for employee" },
      { status: 500 }
    );
  }
}
