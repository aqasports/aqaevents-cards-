import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { createInvoiceSchema } from "@/modules/invoices/validators";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const billingService = new BillingService();

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate, proxy-revalidate",
};

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const result = await billingService.getInvoicesWithStats(search, status);
    return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    logger.error("GET invoices API error:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

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
    logger.error("POST invoice API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Database error during invoice creation: ${details}. If you recently reset the database, please try logging out of the admin panel and logging back in to refresh your session.`
      },
      { status: 500 }
    );
  }
}
