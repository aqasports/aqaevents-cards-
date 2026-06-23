import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/domains/billing/billing.service";

const billingService = new BillingService();

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const result = await billingService.getInvoicesWithStats(search, status);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GET invoices API error:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

const createInvoiceSchema = z.object({
  clientId: z.string(),
  amount: z.number().positive(),
  category: z.enum(["package", "custom", "adhoc"]),
  items: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(["paid", "unpaid"]).default("paid"),
  packageId: z.string().optional(),
  creditDelta: z.number().optional(),
  creditReason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await billingService.createInvoiceWithCredits(parsed.data, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error("POST invoice API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Database error during invoice creation: ${details}. If you recently reset the database, please try logging out of the admin panel and logging back in to refresh your session.`
      },
      { status: 500 }
    );
  }
}
