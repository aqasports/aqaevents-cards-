import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const createPackageSchema = z.object({
  name: z.string().min(2),
  creditAmount: z.number().int().min(1),
  bonusCredits: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const packages = await prisma.package.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { ledgerEntries: true } },
    },
  });

  return NextResponse.json(packages);
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createPackageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, creditAmount, bonusCredits, sortOrder } = parsed.data;
  const totalCredits = creditAmount + bonusCredits;
  const price = creditAmount * 1900;

  const pkg = await prisma.package.create({
    data: {
      name,
      creditAmount,
      bonusCredits,
      totalCredits,
      price,
      sortOrder,
    },
  });

  const sessionResult = await requireSuperAdminSession();
  if (sessionResult.session) {
    await logAdminAction(
      sessionResult.session.user.id,
      "CREATE_PACKAGE",
      `Package "${pkg.name}"`,
      `Created package "${pkg.name}" (${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus, price: ${pkg.price} DA).`
    );
  }

  return NextResponse.json(pkg, { status: 201 });
}
