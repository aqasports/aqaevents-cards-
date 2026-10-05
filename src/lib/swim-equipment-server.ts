import { prisma } from "@/lib/prisma";
import { resolveSoldAtDate, type SaleInput } from "@/lib/swim-equipment-validation";

export interface PreparedSaleWrite {
  article: string;
  clientName: string;
  clientPhone: string;
  leadId: string | null;
  sellPrice: number;
  costPrice: number;
  quantity: number;
  notes: string | null;
  soldAt: Date;
}

export type PrepareSaleResult =
  | { ok: true; data: PreparedSaleWrite }
  | { ok: false; status: number; error: string };

/**
 * Validates the relations of a sale (article in the catalog, lead exists) and builds the
 * Prisma payload. Shared by the create and update routes.
 *
 * `currentArticleCode` allows an existing sale to keep a legacy or since-deactivated article
 * code unchanged while it is edited.
 */
export async function prepareSaleWrite(
  input: SaleInput,
  options: { currentArticleCode?: string } = {}
): Promise<PrepareSaleResult> {
  const keepsCurrentArticle = options.currentArticleCode === input.article;

  if (!keepsCurrentArticle) {
    const article = await prisma.swimEquipmentArticle.findUnique({
      where: { code: input.article },
      select: { active: true },
    });
    if (!article) {
      return { ok: false, status: 400, error: "This article does not exist in the catalog" };
    }
    if (!article.active) {
      return { ok: false, status: 400, error: "This article is inactive in the catalog" };
    }
  }

  if (input.leadId) {
    const lead = await prisma.swimLead.findUnique({
      where: { id: input.leadId },
      select: { id: true },
    });
    if (!lead) {
      return { ok: false, status: 400, error: "The linked request no longer exists" };
    }
  }

  return {
    ok: true,
    data: {
      article: input.article,
      clientName: input.clientName,
      clientPhone: input.clientPhone ?? "",
      leadId: input.leadId ?? null,
      sellPrice: input.sellPrice,
      costPrice: input.costPrice,
      quantity: input.quantity,
      notes: input.notes ?? null,
      soldAt: resolveSoldAtDate(input.soldAt) ?? new Date(),
    },
  };
}
