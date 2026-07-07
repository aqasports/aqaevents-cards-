import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { createSessionExpenseSchema } from "@/modules/activities/validators";

const activitiesService = new ActivitiesService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const expenses = await activitiesService.getSessionExpenses(id);
    return NextResponse.json(expenses);
  } catch (err: unknown) {
    console.error("GET session expenses API error:", err);
    return NextResponse.json({ error: "Failed to fetch session expenses" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = createSessionExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const sessionExpense = await activitiesService.createSessionExpense({
      sessionId: id,
      activityExpenseId: parsed.data.activityExpenseId,
      quantity: parsed.data.quantity,
      amount: parsed.data.amount,
    });
    return NextResponse.json(sessionExpense, { status: 201 });
  } catch (err: unknown) {
    console.error("POST session expense API error:", err);
    return NextResponse.json({ error: "Failed to add session expense" }, { status: 500 });
  }
}
