import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { aggregateSalesStats } from "@/lib/swim-equipment";
import { prepareSaleWrite, type PreparedSaleWrite } from "@/lib/swim-equipment-server";
import {
  formatArticleDescription,
  parseArticleDescription,
} from "@/lib/swim-equipment-utils";
import {
  BatchSaleInputSchema,
  firstValidationMessage,
  SaleInputSchema,
} from "@/lib/swim-equipment-validation";

export const dynamic = "force-dynamic";

async function decrementArticleStocks(
  tx: Pick<typeof prisma, "swimEquipmentArticle">,
  items: Array<{ article: string; quantity: number }>
) {
  const qtyByCode = new Map<string, number>();
  for (const item of items) {
    qtyByCode.set(item.article, (qtyByCode.get(item.article) || 0) + item.quantity);
  }
  const codes = Array.from(qtyByCode.keys());
  if (codes.length === 0) return;

  const articles = await tx.swimEquipmentArticle.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, description: true },
  });

  for (const art of articles) {
    const soldQty = qtyByCode.get(art.code) || 0;
    if (soldQty <= 0) continue;
    const parsed = parseArticleDescription(art.description, art.code);
    if (parsed.meta.stockQty === null || parsed.meta.stockQty === undefined) continue;

    const nextStock = Math.max(0, parsed.meta.stockQty - soldQty);
    const nextDesc = formatArticleDescription(
      { ...parsed.meta, stockQty: nextStock },
      parsed.cleanDescription
    );
    await tx.swimEquipmentArticle.update({
      where: { id: art.id },
      data: { description: nextDesc },
    });
  }
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a from/to query value (YYYY-MM-DD or ISO). `to` date-only values include the whole day. */
function parseRangeBound(value: string | null, endOfDay: boolean): Date | null | "invalid" {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = DATE_ONLY_REGEX.test(trimmed)
    ? new Date(`${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(trimmed);
  return Number.isNaN(candidate.getTime()) ? "invalid" : candidate;
}

/**
 * GET: list sales (newest first) with aggregated profit stats.
 * Pass `include=articles` to receive the catalog in the same response, so the desk loads
 * with a single request instead of two.
 */
export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const article = searchParams.get("article");
  const from = parseRangeBound(searchParams.get("from"), false);
  const to = parseRangeBound(searchParams.get("to"), true);
  const includeArticles = searchParams.get("include") === "articles";

  if (from === "invalid" || to === "invalid") {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const where: Record<string, unknown> = {};
    if (article && article !== "all") {
      where.article = article;
    }
    if (from || to) {
      where.soldAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [sales, articles] = await Promise.all([
      prisma.swimEquipmentSale.findMany({
        where,
        orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
      }),
      includeArticles
        ? prisma.swimEquipmentArticle.findMany({ orderBy: { name: "asc" } })
        : Promise.resolve(undefined),
    ]);

    const stats = aggregateSalesStats(sales);

    return NextResponse.json({
      sales,
      stats,
      ...(articles ? { articles } : {}),
    });
  } catch (err: unknown) {
    logger.error("GET swim equipment sales error:", err);
    return NextResponse.json(
      { error: "Failed to fetch equipment sales" },
      { status: 500 }
    );
  }
}

/** POST: record a single sale or a batch of sales. The client phone is optional. */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const isBatch =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as Record<string, unknown>).items);

  if (isBatch) {
    const parsed = BatchSaleInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const preparedItems: PreparedSaleWrite[] = [];
      for (const item of parsed.data.items) {
        const prepared = await prepareSaleWrite(item);
        if (!prepared.ok) {
          return NextResponse.json({ error: prepared.error }, { status: prepared.status });
        }
        preparedItems.push(prepared.data);
      }

      const createdSales = await prisma.$transaction(async (tx) => {
        const rows = [];
        for (const data of preparedItems) {
          rows.push(await tx.swimEquipmentSale.create({ data }));
        }
        if (parsed.data.decrementStock) {
          await decrementArticleStocks(tx, preparedItems);
        }
        return rows;
      });

      return NextResponse.json(
        { sales: createdSales, count: createdSales.length },
        { status: 201 }
      );
    } catch (err: unknown) {
      logger.error("POST batch swim equipment sales error:", err);
      return NextResponse.json(
        { error: "Failed to record equipment sales" },
        { status: 500 }
      );
    }
  }

  const parsed = SaleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const shouldDecrementStock =
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).decrementStock === true;

  try {
    const prepared = await prepareSaleWrite(parsed.data);
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const sale = shouldDecrementStock
      ? await prisma.$transaction(async (tx) => {
          const created = await tx.swimEquipmentSale.create({ data: prepared.data });
          await decrementArticleStocks(tx, [prepared.data]);
          return created;
        })
      : await prisma.swimEquipmentSale.create({ data: prepared.data });

    return NextResponse.json(sale, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST swim equipment sale error:", err);
    return NextResponse.json(
      { error: "Failed to record equipment sale" },
      { status: 500 }
    );
  }
}
