import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        sessions: {
          take: 10,
          orderBy: { sessionDate: "desc" },
          include: { activity: true },
        },
      },
    });

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    return NextResponse.json(coach);
  } catch (err: unknown) {
    console.error("GET coach error:", err);
    return NextResponse.json({ error: "Failed to fetch coach" }, { status: 500 });
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
    const existing = await prisma.coach.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const trimmedName = String(body.name).trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmedName;
    }

    if (body.email !== undefined) {
      updateData.email = body.email ? String(body.email).trim() : null;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? String(body.phone).trim() : null;
    }
    if (body.specialties !== undefined) {
      updateData.specialties = body.specialties ? String(body.specialties).trim() : null;
    }
    if (body.defaultPayRate !== undefined) {
      updateData.defaultPayRate = Number(body.defaultPayRate) || 0;
    }
    if (body.commissionRate !== undefined) {
      updateData.commissionRate = Number(body.commissionRate) || 0;
    }
    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    const updatedCoach = await prisma.coach.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCoach);
  } catch (err: unknown) {
    console.error("PATCH coach error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to update coach: ${details}` },
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
    const existing = await prisma.coach.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    await prisma.coach.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Coach deleted" });
  } catch (err: unknown) {
    console.error("DELETE coach error:", err);
    return NextResponse.json({ error: "Failed to delete coach" }, { status: 500 });
  }
}
