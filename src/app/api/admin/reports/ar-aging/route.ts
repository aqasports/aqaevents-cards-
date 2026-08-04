/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: { not: "paid" },
      },
      select: {
        id: true,
        clientId: true,
        organizationId: true,
        invoiceCode: true,
        amount: true,
        status: true,
        category: true,
        items: true,
        notes: true,
        paidAt: true,
        createdAt: true,
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();

    let currentAmount = 0;
    let thirtyToSixtyAmount = 0;
    let sixtyToNinetyAmount = 0;
    let overNinetyAmount = 0;
    let totalUnpaid = 0;

    const current: any[] = [];
    const thirtyToSixty: any[] = [];
    const sixtyToNinety: any[] = [];
    const overNinety: any[] = [];

    const entityMap = new Map<
      string,
      { entityType: "client" | "organization"; id: string; name: string; totalUnpaid: number; unpaidInvoicesCount: number }
    >();

    for (const inv of unpaidInvoices) {
      const createdTime = new Date(inv.createdAt).getTime();
      const ageDays = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
      const amount = inv.amount;

      totalUnpaid += amount;

      const item = {
        id: inv.id,
        invoiceCode: inv.invoiceCode,
        amount: inv.amount,
        status: inv.status,
        category: inv.category,
        items: inv.items,
        createdAt: inv.createdAt,
        ageDays,
        clientName: inv.client?.fullName ?? null,
        orgName: inv.organization?.name ?? null,
      };

      if (ageDays <= 30) {
        currentAmount += amount;
        current.push(item);
      } else if (ageDays <= 60) {
        thirtyToSixtyAmount += amount;
        thirtyToSixty.push(item);
      } else if (ageDays <= 90) {
        sixtyToNinetyAmount += amount;
        sixtyToNinety.push(item);
      } else {
        overNinetyAmount += amount;
        overNinety.push(item);
      }

      const entityKey = inv.organization
        ? `org:${inv.organization.id}`
        : `client:${inv.client?.id ?? inv.clientId}`;

      const entityType = inv.organization ? "organization" : "client";
      const entityId = inv.organization ? inv.organization.id : (inv.client?.id ?? inv.clientId);
      const entityName = inv.organization?.name ?? inv.client?.fullName ?? "Unknown Client";

      const existingEntity = entityMap.get(entityKey) || {
        entityType,
        id: entityId,
        name: entityName,
        totalUnpaid: 0,
        unpaidInvoicesCount: 0,
      };

      existingEntity.totalUnpaid += amount;
      existingEntity.unpaidInvoicesCount += 1;
      entityMap.set(entityKey, existingEntity);
    }

    return NextResponse.json({
      summary: {
        currentAmount,
        thirtyToSixtyAmount,
        sixtyToNinetyAmount,
        overNinetyAmount,
        totalUnpaid,
        unpaidInvoiceCount: unpaidInvoices.length,
      },
      agingBuckets: {
        current,
        thirtyToSixty,
        sixtyToNinety,
        overNinety,
      },
      byEntity: Array.from(entityMap.values()),
    });
  } catch (err: unknown) {
    logger.error("GET ar-aging report error:", err);
    return NextResponse.json(
      { error: "Failed to generate A/R aging report" },
      { status: 500 }
    );
  }
}
