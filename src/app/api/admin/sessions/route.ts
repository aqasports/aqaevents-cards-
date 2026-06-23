import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/domains/activities/activities.service";

const activitiesService = new ActivitiesService();

const createSessionSchema = z.object({
  activityId: z.string(),
  sessionDate: z.string(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const activityId = request.nextUrl.searchParams.get("activityId");
  const from = request.nextUrl.searchParams.get("from");

  try {
    const sessions = await activitiesService.getSessions({ activityId, from, activeOnly: true });
    return NextResponse.json(sessions);
  } catch (err: unknown) {
    console.error("GET sessions API error:", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const session = await activitiesService.createSession({
      activityId: parsed.data.activityId,
      sessionDate: new Date(parsed.data.sessionDate),
      location: parsed.data.location,
      capacity: parsed.data.capacity,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    console.error("POST session API error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
