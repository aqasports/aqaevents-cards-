import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ActivitiesService } from "@/domains/activities/activities.service";

const activitiesService = new ActivitiesService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  
  const searchParams = request.nextUrl.searchParams;
  const hard = searchParams.get("hard") === "true";

  try {
    const session = await activitiesService.deleteSession(id, hard);
    return NextResponse.json(hard ? { deleted: true, session } : session);
  } catch (err: unknown) {
    console.error("DELETE session API error:", err);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
