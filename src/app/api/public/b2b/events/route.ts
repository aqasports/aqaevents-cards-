import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get("apiKey") || req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key parameter 'apiKey'" }, { status: 401 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { feedApiKey: apiKey },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        allowedActivities: true,
        creditRate: true,
        whatsappGroupUrl: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Invalid or inactive API Key" }, { status: 401 });
    }

    let allowedIds: string[] = [];
    if (org.allowedActivities) {
      try {
        allowedIds = JSON.parse(org.allowedActivities);
      } catch {
        allowedIds = [];
      }
    }

    const activityWhere = allowedIds.length > 0 ? { id: { in: allowedIds }, active: true } : { active: true };

    const sessions = await prisma.activitySession.findMany({
      where: {
        active: true,
        sessionDate: { gte: new Date() },
        activity: activityWhere,
      },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            description: true,
            creditCost: true,
            imageUrl: true,
            duration: true,
            places: true,
          },
        },
      },
      orderBy: { sessionDate: "asc" },
      take: 20,
    });

    const feedEvents = sessions.map((s) => ({
      sessionId: s.id,
      activityId: s.activity.id,
      title: s.activity.name,
      description: s.activity.description,
      creditCost: s.activity.creditCost,
      customCreditRate: org.creditRate,
      imageUrl: s.activity.imageUrl,
      duration: s.activity.duration,
      location: s.location || s.activity.places,
      sessionDate: s.sessionDate.toISOString(),
      capacity: s.capacity,
    }));

    return NextResponse.json({
      organization: {
        name: org.name,
        logoUrl: org.logoUrl,
        whatsappGroupUrl: org.whatsappGroupUrl,
      },
      upcomingEvents: feedEvents,
      totalCount: feedEvents.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch event feed" }, { status: 500 });
  }
}
