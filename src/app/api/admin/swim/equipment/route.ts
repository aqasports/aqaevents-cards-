import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { aggregateSalesStats } from "@/lib/swim-equipment";
import { prepareSaleWrite } from "@/lib/swim-equipment-server";
import { firstValidationMessage, SaleInputSchema } from "@/lib/swim-equipment-validation";

export const dynamic = "force-dynamic";

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

/** POST: record a sale. The client phone is optional. */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = SaleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const prepared = await prepareSaleWrite(parsed.data);
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const sale = await prisma.swimEquipmentSale.create({ data: prepared.data });

    return NextResponse.json(sale, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST swim equipment sale error:", err);
    return NextResponse.json(
      { error: "Failed to record equipment sale" },
      { status: 500 }
    );
  }
}
