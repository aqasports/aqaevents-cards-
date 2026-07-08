import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/modules/activities/service";
import { createActivitySchema } from "@/modules/activities/validators";
import { prisma } from "@/lib/prisma";

const activitiesService = new ActivitiesService();

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const redeemable = request.nextUrl.searchParams.get("redeemable") === "true";

  try {
    const activities = await activitiesService.getActivities({ redeemableOnly: redeemable });
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

  let { requiresCheck, clubId } = parsed.data;
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
    const activity = await activitiesService.createActivity(
      { ...parsed.data, clubId },
      session.user.id
    );
    return NextResponse.json(activity, { status: 201 });
  } catch (err: unknown) {
    console.error("POST activity API error:", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
