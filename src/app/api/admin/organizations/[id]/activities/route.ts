import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: orgId } = await params;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { allowedActivities: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const allActivities = await prisma.activity.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        creditCost: true,
        imageUrl: true,
        eventType: true,
        duration: true,
      },
      orderBy: { name: "asc" },
    });

    let allowedIds: string[] = [];
    if (org.allowedActivities) {
      try {
        allowedIds = JSON.parse(org.allowedActivities);
      } catch {
        allowedIds = [];
      }
    } else {
      allowedIds = allActivities.map((a) => a.id);
    }

    return NextResponse.json({
      allowedActivityIds: allowedIds,
      activities: allActivities,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch organization activities" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: orgId } = await params;

  try {
    const body = await req.json();
    const { activityIds } = body;

    if (!Array.isArray(activityIds)) {
      return NextResponse.json({ error: "activityIds must be an array of strings" }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        allowedActivities: JSON.stringify(activityIds),
      },
    });

    await logAdminAction(
      session.user.id,
      "UPDATE_ORGANIZATION_ACTIVITIES",
      updated.name,
      `Updated allowed activities for ${updated.name} (${activityIds.length} activities allowed)`
    );

    return NextResponse.json({
      success: true,
      allowedActivityIds: activityIds,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update organization activities" }, { status: 500 });
  }
}
