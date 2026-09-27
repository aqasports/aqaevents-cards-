import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSaleSchema = z.object({
  article: z.enum(["goggles", "cap", "swimsuit"]),
  clientName: z.string().min(1, "Client name is required"),
  clientPhone: z.string().min(1, "Client phone is required"),
  leadId: z.string().optional().nullable(),
  sellPrice: z.number().int().nonnegative("Sell price must be >= 0"),
  costPrice: z.number().int().nonnegative("Cost price must be >= 0"),
  quantity: z.number().int().min(1, "Quantity must be >= 1").default(1),
  notes: z.string().optional().nullable(),
  soldAt: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const article = searchParams.get("article");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const where: Record<string, unknown> = {};
    if (article && article !== "all") {
      where.article = article;
    }
    if (from || to) {
      where.soldAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const sales = await prisma.swimEquipmentSale.findMany({
      where,
      orderBy: { soldAt: "desc" },
    });

    // Aggregate profit stats per article
    const stats = {
      totalSalesRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalUnitsSold: 0,
      byArticle: {} as Record<
        string,
        { revenue: number; cost: number; profit: number; units: number }
      >,
    };

    for (const sale of sales) {
      const revenue = sale.sellPrice * sale.quantity;
      const cost = sale.costPrice * sale.quantity;
      const profit = revenue - cost;

      stats.totalSalesRevenue += revenue;
      stats.totalCost += cost;
      stats.totalProfit += profit;
      stats.totalUnitsSold += sale.quantity;

      if (!stats.byArticle[sale.article]) {
        stats.byArticle[sale.article] = {
          revenue: 0,
          cost: 0,
          profit: 0,
          units: 0,
        };
      }
      stats.byArticle[sale.article].revenue += revenue;
      stats.byArticle[sale.article].cost += cost;
      stats.byArticle[sale.article].profit += profit;
      stats.byArticle[sale.article].units += sale.quantity;
    }

    return NextResponse.json({ sales, stats });
  } catch (err: unknown) {
    logger.error("GET swim equipment sales error:", err);
    return NextResponse.json(
      { error: "Failed to fetch equipment sales" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const parsed = CreateSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const sale = await prisma.swimEquipmentSale.create({
      data: {
        article: data.article,
        clientName: data.clientName.trim(),
        clientPhone: data.clientPhone.trim(),
        leadId: data.leadId || null,
        sellPrice: data.sellPrice,
        costPrice: data.costPrice,
        quantity: data.quantity,
        notes: data.notes?.trim() || null,
        soldAt: data.soldAt ? new Date(data.soldAt) : new Date(),
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST swim equipment sale error:", err);
    return NextResponse.json(
      { error: "Failed to record equipment sale" },
      { status: 500 }
    );
  }
}
