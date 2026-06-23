import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/domains/billing/billing.service";

const billingService = new BillingService();

const addCreditsSchema = z.object({
  packageId: z.string().optional(),
  customAmount: z.number().int().optional(),
  reason: z.string().optional(),
  invoice: z
    .object({
      amount: z.number().int().positive(),
      category: z.enum(["package", "custom", "adhoc"]).default("custom"),
      items: z.string().min(1),
      notes: z.string().optional(),
      status: z.enum(["paid", "unpaid"]).default("paid"),
    })
    .optional(),
});

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
