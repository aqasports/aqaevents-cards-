import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { prepareSaleWrite } from "@/lib/swim-equipment-server";
import { firstValidationMessage, SaleInputSchema } from "@/lib/swim-equipment-validation";

export const dynamic = "force-dynamic";

/** PATCH: edit a recorded sale (all editable fields are sent, same rules as creation). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
  }

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
    const existing = await prisma.swimEquipmentSale.findUnique({
      where: { id },
      select: { id: true, article: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const prepared = await prepareSaleWrite(parsed.data, {
      currentArticleCode: existing.article,
    });
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const sale = await prisma.swimEquipmentSale.update({
      where: { id },
      data: prepared.data,
    });

    return NextResponse.json(sale);
  } catch (err: unknown) {
    logger.error("PATCH swim equipment sale error:", err);
    return NextResponse.json(
      { error: "Failed to update equipment sale" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.swimEquipmentSale.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.swimEquipmentSale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE swim equipment sale error:", err);
    return NextResponse.json(
      { error: "Failed to delete equipment sale" },
      { status: 500 }
    );
  }
}
