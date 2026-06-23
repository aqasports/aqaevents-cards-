import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

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

  const sessions = await prisma.activitySession.findMany({
    where: {
      ...(activityId ? { activityId } : {}),
      ...(from ? { sessionDate: { gte: new Date(from) } } : {}),
      active: true,
    },
    include: { activity: true },
    orderBy: { sessionDate: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const session = await prisma.activitySession.create({
    data: {
      activityId: parsed.data.activityId,
      sessionDate: new Date(parsed.data.sessionDate),
      location: parsed.data.location,
      capacity: parsed.data.capacity,
    },
    include: { activity: true },
  });

  return NextResponse.json(session, { status: 201 });
}
