import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const equipment = await prisma.equipmentAsset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { usageLogs: true } },
      },
    });

    return NextResponse.json(equipment);
  } catch (err: unknown) {
    logger.error("GET equipment error:", err);
    return NextResponse.json({ error: "Failed to fetch equipment assets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      name,
      category,
      purchasePrice,
      purchaseDate,
      usefulLifeMonths,
      maintenanceCost,
      status,
      notes,
    } = body;

    const trimmedName = name?.trim();
    const trimmedCategory = category?.trim();

    if (!trimmedName || !trimmedCategory) {
      return NextResponse.json(
        { error: "Name and Category are required" },
        { status: 400 }
      );
    }

    const parsedPrice = Number(purchasePrice) || 0;
    const parsedLifespan = Number(usefulLifeMonths) || 36;
    const parsedMaintenance = Number(maintenanceCost) || 0;
    const parsedDate = purchaseDate ? new Date(purchaseDate) : new Date();

    const asset = await prisma.equipmentAsset.create({
      data: {
        name: trimmedName,
        category: trimmedCategory,
        purchasePrice: parsedPrice,
        purchaseDate: parsedDate,
        usefulLifeMonths: parsedLifespan,
        maintenanceCost: parsedMaintenance,
        status: status?.trim() || "available",
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST equipment error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create equipment asset: ${details}` },
      { status: 500 }
    );
  }
}
