import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const coaches = await prisma.coach.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { sessions: true } },
      },
    });

    return NextResponse.json(coaches);
  } catch (err: unknown) {
    logger.error("GET coaches error:", err);
    return NextResponse.json({ error: "Failed to fetch coaches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { name, email, phone, specialties, defaultPayRate, commissionRate, active } = body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const trimmedEmail = email?.trim() || null;
    const trimmedPhone = phone?.trim() || null;
    const trimmedSpecialties = specialties?.trim() || null;
    const parsedDefaultPayRate = Number(defaultPayRate) || 0;
    const parsedCommissionRate = Number(commissionRate) || 0;
    const isActive = active !== undefined ? Boolean(active) : true;

    const coach = await prisma.coach.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        specialties: trimmedSpecialties,
        defaultPayRate: parsedDefaultPayRate,
        commissionRate: parsedCommissionRate,
        active: isActive,
      },
    });

    return NextResponse.json(coach, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST coach error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create coach: ${details}` },
      { status: 500 }
    );
  }
}
