import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { DepartmentsService } from "@/modules/departments/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const service = new DepartmentsService();

    const updated = await service.reassignEmployee(body, session.user.id);
    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error("POST reassign department error:", err);
    return NextResponse.json({ error: err?.message || "Failed to reassign employee department" }, { status: 400 });
  }
}
