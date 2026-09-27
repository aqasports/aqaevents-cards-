import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateArticleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional().nullable(),
  defaultSellPrice: z.number().int().nonnegative().optional(),
  defaultCostPrice: z.number().int().nonnegative().optional(),
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
        { error: "Validation failed", details: parsed.error.flatten() },
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
