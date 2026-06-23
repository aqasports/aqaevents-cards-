import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const patchExpenseSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
  activityId: z.string().optional(),
  createdAt: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = patchExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const expense = await prisma.activityExpense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const { name, amount, notes, activityId, createdAt } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (amount !== undefined) updateData.amount = amount;
    if (notes !== undefined) updateData.notes = notes;
    if (activityId !== undefined) updateData.activityId = activityId;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

    const updated = await prisma.activityExpense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PATCH expense database error:", err);
    return NextResponse.json({ error: "Database error updating expense" }, { status: 500 });
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
    const expense = await prisma.activityExpense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.activityExpense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete expense database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during expense deletion: ${details}` },
      { status: 500 },
    );
  }
}
