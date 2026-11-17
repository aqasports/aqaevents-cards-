import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  DEFAULT_SWIM_CATALOG_TEMPLATES,
  formatArticleDescription,
} from "@/lib/swim-equipment-utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ArticleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(60, "Code is too long")
    .regex(/^[a-z0-9-]+$/, "Code must be lowercase letters, digits, and hyphens only"),
  description: z.string().trim().max(2000, "Description is too long").optional().nullable(),
  defaultSellPrice: z.number().int().min(0, "Sell price must be >= 0").max(10_000_000).default(0),
  defaultCostPrice: z.number().int().min(0, "Cost price must be >= 0").max(10_000_000).default(0),
  active: z.boolean().default(true),
});

// GET: list all articles (optionally filter active only)
export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  try {
    const articles = await prisma.swimEquipmentArticle.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(articles);
  } catch (err: unknown) {
    logger.error("GET swim equipment articles error:", err);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

// POST: create a new article (or seed default AQA Swim catalog templates when seedDefaults=true)
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();

    if (
      body &&
      typeof body === "object" &&
      (body as Record<string, unknown>).seedDefaults === true
    ) {
      const existingRows = await prisma.swimEquipmentArticle.findMany({
        select: { code: true },
      });
      const existingCodes = new Set(existingRows.map((r) => r.code));
      const missingTemplates = DEFAULT_SWIM_CATALOG_TEMPLATES.filter(
        (tpl) => !existingCodes.has(tpl.code)
      );

      if (missingTemplates.length > 0) {
        await prisma.$transaction(
          missingTemplates.map((tpl) =>
            prisma.swimEquipmentArticle.create({
              data: {
                name: tpl.name,
                code: tpl.code,
                description: formatArticleDescription(
                  {
                    category: tpl.category,
                    stockQty: tpl.stockQty,
                    minStockAlert: tpl.minStockAlert,
                    sizes: tpl.sizes,
                  },
                  tpl.cleanDescription
                ),
                defaultSellPrice: tpl.defaultSellPrice,
                defaultCostPrice: tpl.defaultCostPrice,
                active: tpl.active,
              },
            })
          )
        );
      }

      const articles = await prisma.swimEquipmentArticle.findMany({
        orderBy: { name: "asc" },
      });

      return NextResponse.json(
        { createdCount: missingTemplates.length, articles },
        { status: missingTemplates.length > 0 ? 201 : 200 }
      );
    }

    const parsed = ArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check code uniqueness
    const existing = await prisma.swimEquipmentArticle.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Article code "${data.code}" is already in use` },
        { status: 409 }
      );
    }

    const article = await prisma.swimEquipmentArticle.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim(),
        description: data.description?.trim() || null,
        defaultSellPrice: data.defaultSellPrice,
        defaultCostPrice: data.defaultCostPrice,
        active: data.active,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST swim equipment article error:", err);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
