import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

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
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updatePackageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const creditAmount = parsed.data.creditAmount !== undefined ? parsed.data.creditAmount : existing.creditAmount;
  const bonusCredits = parsed.data.bonusCredits !== undefined ? parsed.data.bonusCredits : existing.bonusCredits;
  
  const totalCredits = creditAmount + bonusCredits;
  const price = creditAmount * 1900;

  const pkg = await prisma.package.update({
    where: { id },
    data: {
      name: parsed.data.name,
      creditAmount: parsed.data.creditAmount,
      bonusCredits: parsed.data.bonusCredits,
      totalCredits,
      price,
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
    },
  });

  const sessionResult = await requireSuperAdminSession();
  if (sessionResult.session) {
    await logAdminAction(
      sessionResult.session.user.id,
      "UPDATE_PACKAGE",
      `Package "${pkg.name}"`,
      `Updated package "${pkg.name}" (Credits: ${pkg.creditAmount} + ${pkg.bonusCredits} bonus, price: ${pkg.price} DA, active: ${pkg.active}).`
    );
  }

  return NextResponse.json(pkg);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;

  // Soft delete — just mark inactive
  const pkg = await prisma.package.update({
    where: { id },
    data: { active: false },
  });

  const sessionResult = await requireSuperAdminSession();
  if (sessionResult.session) {
    await logAdminAction(
      sessionResult.session.user.id,
      "ARCHIVE_PACKAGE",
      `Package "${pkg.name}"`,
      `Archived package "${pkg.name}" (marked active = false).`
    );
  }

  return NextResponse.json(pkg);
}
