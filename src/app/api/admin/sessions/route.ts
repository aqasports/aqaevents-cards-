import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { createSessionSchema } from "@/modules/activities/validators";

const activitiesService = new ActivitiesService();

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const activityId = request.nextUrl.searchParams.get("activityId");
  const from = request.nextUrl.searchParams.get("from");
  const activeOnlyParam = request.nextUrl.searchParams.get("activeOnly");
  const activeOnly = activeOnlyParam === "false" ? false : true;

  try {
    const sessions = await activitiesService.getSessions({ activityId, from, activeOnly });
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
      clubId: parsed.data.clubId,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    console.error("POST session API error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
