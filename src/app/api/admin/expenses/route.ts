import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { createExpenseSchema } from "@/modules/activities/validators";

const activitiesService = new ActivitiesService();

export async function GET(_request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const expenses = await activitiesService.getExpenses();
    return NextResponse.json(expenses);
  } catch (err: unknown) {
    console.error("GET expenses API error:", err);
    return NextResponse.json({ error: "Failed to retrieve expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const activity = await activitiesService.getActivity(parsed.data.activityId);
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const expense = await activitiesService.createExpense(parsed.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (err: unknown) {
    console.error("POST expense API error:", err);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
