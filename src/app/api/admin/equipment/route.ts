import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const searchParams = request?.nextUrl?.searchParams;
    const category = searchParams?.get("category");
    const status = searchParams?.get("status");
    const search = searchParams?.get("search")?.trim();
    const sortBy = searchParams?.get("sortBy") || "createdAt";
    const sortDir = searchParams?.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};

    if (category && category !== "all") {
      where.category = category;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
    if (sortBy === "name") orderBy = { name: sortDir };
    else if (sortBy === "purchasePrice") orderBy = { purchasePrice: sortDir };
    else if (sortBy === "purchaseDate") orderBy = { purchaseDate: sortDir };
    else if (sortBy === "usefulLifeMonths") orderBy = { usefulLifeMonths: sortDir };
    else if (sortBy === "maintenanceCost") orderBy = { maintenanceCost: sortDir };

    const equipment = await prisma.equipmentAsset.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy,
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

    if (session.user?.id) {
      await logAdminAction(
        session.user.id,
        "CREATE_EQUIPMENT",
        asset.name,
        `Created equipment asset ${asset.name} (${asset.category})`
      );
    }

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
