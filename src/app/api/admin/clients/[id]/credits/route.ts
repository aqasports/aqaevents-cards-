import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { addCreditsSchema } from "@/modules/invoices/validators";

const billingService = new BillingService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: clientId } = await params;
  const body = await request.json();
  const parsed = addCreditsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await billingService.rechargeCredits(clientId, parsed.data, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("POST client credits recharge API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Database error during credit transaction: ${details}. If you recently reset the database, please try logging out of the admin panel and logging back in to refresh your session.`,
      },
      { status: 500 },
    );
  }
}
