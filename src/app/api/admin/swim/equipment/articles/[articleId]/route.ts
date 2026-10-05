import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateArticleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long").optional(),
  description: z.string().trim().max(300, "Description is too long").optional().nullable(),
  defaultSellPrice: z.number().int().min(0, "Sell price must be >= 0").max(10_000_000).optional(),
  defaultCostPrice: z.number().int().min(0, "Cost price must be >= 0").max(10_000_000).optional(),
  active: z.boolean().optional(),
});

// PATCH: update an article (code is immutable after creation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { articleId } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existing = await prisma.swimEquipmentArticle.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const data = parsed.data;
    const article = await prisma.swimEquipmentArticle.update({
      where: { id: articleId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.defaultSellPrice !== undefined && {
          defaultSellPrice: data.defaultSellPrice,
        }),
        ...(data.defaultCostPrice !== undefined && {
          defaultCostPrice: data.defaultCostPrice,
        }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    return NextResponse.json(article);
  } catch (err: unknown) {
    logger.error("PATCH swim equipment article error:", err);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

// DELETE: delete an article
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { articleId } = await params;

  try {
    const existing = await prisma.swimEquipmentArticle.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await prisma.swimEquipmentArticle.delete({ where: { id: articleId } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE swim equipment article error:", err);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
