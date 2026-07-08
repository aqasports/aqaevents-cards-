import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { updateActivitySchema } from "@/modules/activities/validators";
import { prisma } from "@/lib/prisma";

const activitiesService = new ActivitiesService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const activity = await activitiesService.getActivity(id);
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    return NextResponse.json(activity);
  } catch (err: unknown) {
    console.error("GET activity details API error:", err);
    return NextResponse.json({ error: "Failed to fetch activity details" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateActivitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Load existing activity to check current requiresCheck and clubId if not provided
  const existingActivity = await prisma.activity.findUnique({
    where: { id },
    select: { requiresCheck: true, clubId: true },
  });

  if (!existingActivity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  let requiresCheck = parsed.data.requiresCheck !== undefined ? parsed.data.requiresCheck : existingActivity.requiresCheck;
  let clubId = parsed.data.clubId !== undefined ? parsed.data.clubId : existingActivity.clubId;

  if (requiresCheck) {
    if (!clubId) {
      return NextResponse.json({ error: "A club must be selected when check-in is required." }, { status: 400 });
    }
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { isActive: true },
    });
    if (!club || !club.isActive) {
      return NextResponse.json({ error: "Selected club is invalid or inactive." }, { status: 400 });
    }
  } else {
    clubId = null;
  }

  try {
    const activity = await activitiesService.updateActivity(
      id,
      { ...parsed.data, clubId },
      session.user.id
    );
    return NextResponse.json(activity);
  } catch (err: unknown) {
    console.error("PATCH activity API error:", err);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await activitiesService.deleteActivity(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE activity API error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete activity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
