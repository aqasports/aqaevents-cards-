import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const createActivitySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  creditCost: z.number().int().nonnegative().default(1),
  imageUrl: z.string().optional().nullable(),
  places: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  expenses: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().int().positive(),
    notes: z.string().optional().nullable(),
  })).optional(),
});

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const activities = await prisma.activity.findMany({
    include: {
      sessions: {
        where: { active: true, sessionDate: { gte: new Date() } },
        orderBy: { sessionDate: "asc" },
        take: 5,
      },
      expenses: true,
      _count: { select: { redemptions: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createActivitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { expenses, ...activityData } = parsed.data;

  const activity = await prisma.activity.create({
    data: {
      ...activityData,
      expenses: expenses ? {
        create: expenses
      } : undefined
    },
    include: {
      expenses: true
    }
  });

  const sessionResult = await requireSuperAdminSession();
  if (sessionResult.session) {
    await logAdminAction(
      sessionResult.session.user.id,
      "CREATE_ACTIVITY",
      `Activity "${activity.name}"`,
      `Created activity "${activity.name}" (Credit cost: ${activity.creditCost}, duration: ${activity.duration || "None"}).`
    );
  }

  return NextResponse.json(activity, { status: 201 });
}
