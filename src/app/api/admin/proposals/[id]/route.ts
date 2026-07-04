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

    if (status !== "pending" && status !== "reviewed" && status !== "archived") {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    const proposal = await prisma.activityProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const updatedProposal = await prisma.activityProposal.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedProposal);
  } catch (err: unknown) {
    console.error("PATCH proposal error:", err);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
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
    const proposal = await prisma.activityProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await prisma.activityProposal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE proposal error:", err);
    return NextResponse.json({ error: "Failed to delete proposal" }, { status: 500 });
  }
}
