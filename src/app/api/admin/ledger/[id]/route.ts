import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { updateLedgerSchema } from "@/modules/invoices/validators";

const billingService = new BillingService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateLedgerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const updated = await billingService.updateLedgerEntry(id, parsed.data, session.user.id);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PATCH ledger entry API error:", err);
    return NextResponse.json({ error: "Failed to update ledger entry" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await billingService.deleteLedgerEntry(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE ledger entry API error:", err);
    return NextResponse.json({ error: "Failed to delete ledger entry" }, { status: 500 });
  }
}
