import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";

  try {
    const where = status === "all" ? {} : { status };
    const leads = await prisma.swimLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leads);
  } catch (err: unknown) {
    logger.error("GET admin swim leads error:", err);
    return NextResponse.json({ error: "Failed to fetch swim leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      birthDate,
      category,
      level,
      frequency,
      formula,
      duration,
      preferredDays,
      notes,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: "Full name and phone are required" }, { status: 400 });
    }

    const lead = await prisma.swimLead.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        category: category || "homme",
        level: level || "beginner",
        frequency: frequency || "1x",
        formula: formula || "G10",
        duration: duration || "3m",
        preferredDays: preferredDays || null,
        notes: notes?.trim() || null,
        status: "pending",
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST admin swim lead error:", err);
    return NextResponse.json({ error: "Failed to create swim lead" }, { status: 500 });
  }
}
