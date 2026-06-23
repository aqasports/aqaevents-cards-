import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/domains/activities/activities.service";

const activitiesService = new ActivitiesService();

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

  try {
    const activities = await activitiesService.getActivities();
    return NextResponse.json(activities);
  } catch (err: unknown) {
    console.error("GET activities API error:", err);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = createActivitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const activity = await activitiesService.createActivity(parsed.data, session.user.id);
    return NextResponse.json(activity, { status: 201 });
  } catch (err: unknown) {
    console.error("POST activity API error:", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
