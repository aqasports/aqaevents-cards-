import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { updateSessionExpenseSchema } from "@/modules/activities/validators";

const activitiesService = new ActivitiesService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { expenseId } = await params;
  const body = await request.json();
  const parsed = updateSessionExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await activitiesService.updateSessionExpense(expenseId, parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("PATCH session expense API error:", err);
    return NextResponse.json({ error: "Failed to update session expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { expenseId } = await params;

  try {
    const result = await activitiesService.deleteSessionExpense(expenseId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE session expense API error:", err);
    return NextResponse.json({ error: "Failed to delete session expense" }, { status: 500 });
  }
}
