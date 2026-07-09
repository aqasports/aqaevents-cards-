import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { updateInvoiceSchema } from "@/modules/invoices/validators";

const billingService = new BillingService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const invoice = await billingService.getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (err: unknown) {
    console.error("GET invoice API error:", err);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await billingService.updateInvoiceWithCredits(id, parsed.data, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("PATCH invoice API error:", err);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await billingService.deleteInvoice(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE invoice API error:", err);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
