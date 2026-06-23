import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const expenses = await prisma.activityExpense.findMany({
      include: {
        activity: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return NextResponse.json(expenses);
  } catch (err: unknown) {
    console.error("GET expenses database error:", err);
    return NextResponse.json({ error: "Database error retrieving expenses" }, { status: 500 });
  }
}

const createExpenseSchema = z.object({
  activityId: z.string(),
  name: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const activity = await prisma.activity.findUnique({
      where: { id: parsed.data.activityId },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const expense = await prisma.activityExpense.create({
      data: parsed.data,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err: unknown) {
    console.error("Create expense database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during expense creation: ${details}` },
      { status: 500 },
    );
  }
}
