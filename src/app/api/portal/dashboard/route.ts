import { NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        creditRate: true,
        sharedCreditPool: true,
        useSharedPool: true,
        createdAt: true,
        updatedAt: true,
        contracts: {
          where: { status: "active" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        departments: {
          select: {
            id: true,
            name: true,
            budgetCap: true,
            _count: { select: { clients: true } },
          },
        },
        _count: { select: { clients: true, invoices: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get total employees
    const totalEmployees = org._count.clients;

    // Get total credits allocated directly onto cards
    const cardLedgerSum = await prisma.ledgerEntry.aggregate({
      where: {
        client: { organizationId },
        type: { in: ["ORG_POOL_ALLOCATION", "PACKAGE_PURCHASE", "ADMIN_ADJUSTMENT"] },
      },
      _sum: { delta: true },
    });

    const totalAllocatedCredits = Math.max(0, cardLedgerSum._sum.delta || 0);

    // Get 30-day burn rate (total credits redeemed in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const redemptions30Days = await prisma.redemption.aggregate({
      where: {
        client: { organizationId },
        redeemedAt: { gte: thirtyDaysAgo },
      },
      _sum: { creditsUsed: true },
    });

    const monthlyBurnRate = redemptions30Days._sum.creditsUsed || 0;

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        sharedCreditPool: org.sharedCreditPool,
        useSharedPool: org.useSharedPool,
        creditRate: org.creditRate,
      },
      stats: {
        totalEmployees,
        sharedCreditPool: org.sharedCreditPool,
        totalAllocatedCredits,
        monthlyBurnRate,
      },
      activeContract: org.contracts[0] || null,
      departmentsCount: org.departments.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch portal dashboard" }, { status: 500 });
  }
}
