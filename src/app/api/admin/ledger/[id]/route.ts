import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateLedgerSchema = z.object({
  delta: z.number().optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateLedgerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Ledger entry not found" }, { status: 404 });
    }

    const updated = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        delta: parsed.data.delta !== undefined ? parsed.data.delta : entry.delta,
        reason: parsed.data.reason !== undefined ? parsed.data.reason : entry.reason,
        type: parsed.data.delta !== undefined ? (parsed.data.delta > 0 ? "credit" : "debit") : entry.type,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("Update ledger entry database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during ledger update: ${details}` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Ledger entry not found" }, { status: 404 });
    }

    await prisma.ledgerEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete ledger entry database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during ledger deletion: ${details}` },
      { status: 500 },
    );
  }
}
