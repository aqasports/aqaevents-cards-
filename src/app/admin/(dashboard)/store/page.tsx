export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import StoreClient from "./store-client";

export default async function StoreHubPage() {
  try {
    const [
      storeProductsCount,
      swimArticlesCount,
      swimSales,
      swimLeads,
    ] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.swimEquipmentArticle.count({ where: { active: true } }),
      prisma.swimEquipmentSale.findMany({
        select: {
          sellPrice: true,
          costPrice: true,
          quantity: true,
        },
      }),
      prisma.swimLead.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          category: true,
          level: true,
          status: true,
          createdAt: true,
          notes: true,
        },
      }),
    ]);

    let gearUnitsSold = 0;
    let gearNetProfit = 0;
    for (const sale of swimSales) {
      const qty = sale.quantity ?? 1;
      gearUnitsSold += qty;
      gearNetProfit += (sale.sellPrice - sale.costPrice) * qty;
    }

    const serializedLeads = swimLeads.map((lead) => ({
      id: lead.id,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      category: lead.category ?? "homme",
      level: lead.level ?? "beginner",
      status: lead.status,
      createdAt: lead.createdAt.toISOString(),
      notes: lead.notes,
    }));

    return (
      <StoreClient
        storeProductsCount={storeProductsCount}
        swimArticlesCount={swimArticlesCount}
        gearUnitsSold={gearUnitsSold}
        gearNetProfit={gearNetProfit}
        rawLeads={serializedLeads}
      />
    );
  } catch (error) {
    console.error("[StoreHubPage] Failed to load store metrics:", error);
    return (
      <StoreClient
        storeProductsCount={0}
        swimArticlesCount={0}
        gearUnitsSold={0}
        gearNetProfit={0}
        rawLeads={[]}
      />
    );
  }
}
