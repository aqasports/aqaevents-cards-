import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const campaigns = await prisma.campaignPromo.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (err: unknown) {
    console.error("GET campaign promos error:", err);
    return NextResponse.json(
      { error: "Failed to fetch campaign promos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      validFrom,
      validUntil,
      active,
    } = body;

    const trimmedCode = code ? String(code).trim().toUpperCase() : "";
    if (!trimmedCode) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    if (discountType !== "percentage" && discountType !== "fixed") {
      return NextResponse.json(
        { error: "discountType must be 'percentage' or 'fixed'" },
        { status: 400 }
      );
    }

    const parsedValue = Number(discountValue);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      return NextResponse.json(
        { error: "discountValue must be a positive number" },
        { status: 400 }
      );
    }

    const existing = await prisma.campaignPromo.findUnique({
      where: { code: trimmedCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Promo code '${trimmedCode}' already exists` },
        { status: 400 }
      );
    }

    const promo = await prisma.campaignPromo.create({
      data: {
        code: trimmedCode,
        discountType,
        discountValue: parsedValue,
        maxUses: maxUses !== undefined && maxUses !== null ? Number(maxUses) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (err: unknown) {
    console.error("POST campaign promo error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create promo code: ${details}` },
      { status: 500 }
    );
  }
}
