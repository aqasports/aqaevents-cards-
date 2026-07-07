import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";

const activitiesService = new ActivitiesService();

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
