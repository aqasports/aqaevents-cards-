import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { updateExpenseSchema } from "@/modules/activities/validators";

const activitiesService = new ActivitiesService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, amount, notes, activityId, createdAt } = parsed.data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (amount !== undefined) updateData.amount = amount;
    if (notes !== undefined) updateData.notes = notes;
    if (activityId !== undefined) updateData.activityId = activityId;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

    const updated = await activitiesService.updateExpense(id, updateData);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PATCH expense API error:", err);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const result = await activitiesService.deleteExpense(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE expense API error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete expense.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
