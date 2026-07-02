import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (status !== "rejected") {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    const demand = await prisma.cardDemand.findUnique({
      where: { id },
    });

    if (!demand) {
      return NextResponse.json({ error: "Demand not found" }, { status: 404 });
    }

    const updatedDemand = await prisma.cardDemand.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedDemand);
  } catch (err: unknown) {
    console.error("PATCH demand error:", err);
    return NextResponse.json({ error: "Failed to update demand" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const demand = await prisma.cardDemand.findUnique({
      where: { id },
    });

    if (!demand) {
      return NextResponse.json({ error: "Demand not found" }, { status: 404 });
    }

    await prisma.cardDemand.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE demand error:", err);
    return NextResponse.json({ error: "Failed to delete demand" }, { status: 500 });
  }
}
