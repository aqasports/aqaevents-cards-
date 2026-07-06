import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { redeemSchema } from "@/modules/invoices/validators";
import { getClientBalance } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

const billingService = new BillingService();

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const redemptions = await billingService.getRedemptions();
    return NextResponse.json(redemptions);
  } catch (err: unknown) {
    console.error("GET redemptions API error:", err);
    return NextResponse.json({ error: "Failed to fetch redemptions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = redeemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { clientId, activityId, sessionId, notes, bypassBalanceCheck, creditsUsed } = parsed.data;

  const isSuperAdmin = session.user.role === "super_admin";
  if (bypassBalanceCheck && !isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized to bypass balance check" }, { status: 403 });
  }

  try {
    const result = await billingService.createRedemption(
      clientId,
      activityId,
      { sessionId, notes, bypassBalanceCheck, creditsUsed },
      session.user.id
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("POST redemption API error:", err);
    
    if (err instanceof Error) {
      if (err.message === "ACTIVITY_NOT_FOUND") {
        return NextResponse.json({ error: "Activity not found" }, { status: 404 });
      }
      if (err.message === "CLIENT_NOT_FOUND") {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      if (err.message === "INSUFFICIENT_BALANCE") {
        const currentBalance = await getClientBalance(clientId);
        const activity = await prisma.activity.findUnique({ where: { id: activityId } });
        return NextResponse.json(
          { error: "Insufficient balance", balance: currentBalance, required: creditsUsed ?? activity?.creditCost ?? 1 },
          { status: 400 },
        );
      }
      if (err.message === "NO_AVAILABLE_EVENTS") {
        return NextResponse.json({ error: "Redemption is only allowed for activities with upcoming scheduled events." }, { status: 400 });
      }
      if (err.message === "SESSION_NOT_AVAILABLE") {
        return NextResponse.json({ error: "The selected event is no longer available or has already passed." }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: "Failed to create redemption" }, { status: 500 });
  }
}
