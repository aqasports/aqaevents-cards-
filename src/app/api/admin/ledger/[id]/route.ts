import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/domains/billing/billing.service";

const billingService = new BillingService();

const updateLedgerSchema = z.object({
  delta: z.number().optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateLedgerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const updated = await billingService.updateLedgerEntry(id, parsed.data);
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
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const result = await billingService.deleteLedgerEntry(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE ledger entry API error:", err);
    return NextResponse.json({ error: "Failed to delete ledger entry" }, { status: 500 });
  }
}
