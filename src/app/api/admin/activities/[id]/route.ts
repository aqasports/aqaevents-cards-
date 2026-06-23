import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/domains/activities/activities.service";

const activitiesService = new ActivitiesService();

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  creditCost: z.number().int().nonnegative().optional(),
  imageUrl: z.string().optional().nullable(),
  places: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

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
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const activity = await activitiesService.updateActivity(id, parsed.data, session.user.id);
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
