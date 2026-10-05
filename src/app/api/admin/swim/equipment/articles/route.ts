import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
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
  description: z.string().trim().max(300, "Description is too long").optional().nullable(),
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

// POST: create a new article
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
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
