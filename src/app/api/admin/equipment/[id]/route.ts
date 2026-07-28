import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const asset = await prisma.equipmentAsset.findUnique({
      where: { id },
      include: {
        usageLogs: {
          take: 20,
          orderBy: { loggedAt: "desc" },
          include: {
            session: {
              include: { activity: true },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Equipment asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (err: unknown) {
    logger.error("GET equipment asset error:", err);
    return NextResponse.json({ error: "Failed to fetch equipment asset" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const existing = await prisma.equipmentAsset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Equipment asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name;
    }

    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category) {
        return NextResponse.json({ error: "Category cannot be empty" }, { status: 400 });
      }
      updateData.category = category;
    }

    if (body.purchasePrice !== undefined) {
      updateData.purchasePrice = Number(body.purchasePrice) || 0;
    }
    if (body.purchaseDate !== undefined) {
      updateData.purchaseDate = new Date(body.purchaseDate);
    }
    if (body.usefulLifeMonths !== undefined) {
      updateData.usefulLifeMonths = Number(body.usefulLifeMonths) || 36;
    }
    if (body.maintenanceCost !== undefined) {
      updateData.maintenanceCost = Number(body.maintenanceCost) || 0;
    }
    if (body.status !== undefined) {
      updateData.status = String(body.status).trim();
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes ? String(body.notes).trim() : null;
    }

    const updatedAsset = await prisma.equipmentAsset.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedAsset);
  } catch (err: unknown) {
    logger.error("PATCH equipment asset error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to update equipment asset: ${details}` },
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

  try {
    const existing = await prisma.equipmentAsset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Equipment asset not found" }, { status: 404 });
    }

    await prisma.equipmentAsset.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Equipment asset deleted" });
  } catch (err: unknown) {
    logger.error("DELETE equipment asset error:", err);
    return NextResponse.json({ error: "Failed to delete equipment asset" }, { status: 500 });
  }
}
