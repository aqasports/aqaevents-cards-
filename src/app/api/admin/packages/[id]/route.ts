import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/domains/billing/billing.service";

const billingService = new BillingService();

const updatePackageSchema = z.object({
  name: z.string().min(2).optional(),
  creditAmount: z.number().int().min(1).optional(),
  bonusCredits: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updatePackageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const pkg = await billingService.updatePackage(id, parsed.data, session.user.id);
    return NextResponse.json(pkg);
  } catch (err: unknown) {
    console.error("PATCH package API error:", err);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const pkg = await billingService.deletePackage(id, session.user.id);
    return NextResponse.json(pkg);
  } catch (err: unknown) {
    console.error("DELETE package API error:", err);
    return NextResponse.json({ error: "Failed to archive package" }, { status: 500 });
  }
}
